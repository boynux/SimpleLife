import urllib2
import cStringIO
import StringIO
import base64
import Image as imaging
import webapp2
import jinja2
import facebook
import datetime

from google.appengine.ext import ndb
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from webapp2_extras import sessions
from google.appengine.api import taskqueue
import lib.cloudstorage as gcs

import json
import os

from config import *
from models.user import User
from models.album import Album
from models.image import Image
from models.photo import Photo

from handlers import FacebookHandler, fb_require_token

class CurrentUserHandler (FacebookHandler):
    def get (self):
        if self.current_user:
            self.response.out.write (json.dumps ({'uid': self.current_user['id']}))
        else:
            self.abort (401)

class MainPage (FacebookHandler):
    def get (self):
        self.display ()

class SignInPage (FacebookHandler):
    def get (self):
        response = {'success': False}

        if self.current_user:
            response["success"] = True
            response["id"] = self.current_user["id"]
          
        self.response.out.write (json.dumps (response));

class AlbumsHandler (FacebookHandler):
    def get (self, albumId):
        result = []

        if self.current_user:
            user = User.get_user_by_id (self.current_user["id"])

            graph = facebook.GraphAPI (user.access_token)
            userInfo = graph.get_object ("%s" % user.id)

            if albumId:
                result = Album.query (albumId, ancestor = user.key).fetch ()
            else:
                result = [
                    {"id": album.key.id(), "name": album.name, "cover": "/image/%s" % album.cover}
                    for album in user.albums
                ]
        else:
            pass

        self.response.out.write (json.dumps (result))

    def post (self, action):
        if self.current_user:
            data = json.loads (self.request.body)

            if self.current_user:
                user = User.get_user_by_id (self.current_user['id'])

            if data:
                album = user.add_album (data)
                taskqueue.add(url='/extractor', params = {'user': user.id,
                    "album": album.key.id (), 'fb_albums': json.dumps
                    (data["fb_albums"])})

                taskqueue.add(url='/create-cover', params = {'user': user.id,
                    "album": album.key.id (), 'fb_album': data["fb_albums"][0]["id"]})

class CreateCover (webapp2.RequestHandler):
    def post (self):
        user_id = self.request.get ('user')
        print 'Create cover for  user id: %s' % user_id

        album_key = self.request.get ('album')
        fb_album = self.request.get ('fb_album')
        images = []

        user = User.get_user_by_id (user_id)
        album = ndb.Key (Album, int(album_key), parent=user.key).get ()

        graph = facebook.GraphAPI (user.access_token)
        pictures = graph.get_object ("%s/photos" % fb_album, fields="picture",
                limit=4)

        if pictures:
            bg = imaging.new ('RGBA', (200, 200))
            position = (
                (0, 0, 100, 100),
                (0, 100, 100, 200),
                (100, 0, 200, 100),
                (100, 100, 200, 200)
            )

            try:
                index = 0
                for picture in pictures["data"]: 
                    data = cStringIO.StringIO(urllib2.urlopen(picture["picture"]).read ())
                    img = imaging.open (data)
                    
                    ratio = float (max (img.size)) / float (min (img.size))
                    size = int (img.size[0] * ratio), int (img.size[1] * ratio)
                    oldsize = img.size

                    diff = tuple (x - y for x, y in zip (size, oldsize))

                    img = img.resize (size)
                    thumbnail = img.crop ((diff[0] / 2, diff[1] / 2, 100
                        + diff[0] / 2, 100 + diff[1] /2 ))

                    padding = [(100 - thumbnail.size[0]) / 2, (100 -
                        thumbnail.size[1]) / 2]

                    bg.paste (thumbnail, (position[index][0] + padding[0],
                        position[index][1] + padding[1], position[index][2] -
                        padding[0], position[index][3] - padding[1]))
                    index += 1
                    
                    if index > 4:
                        break

                filename = "/covers/%s_cover" % album.key
                with gcs.open (filename, 'w') as cover:
                    bg.save (cover, 'PNG')
                
                blobkey = blobstore.create_gs_key ("/gs%s" % filename)
                album.cover = blobstore.BlobKey (blobkey)

                album.put ()
            except ValueError as e:
                raise e


class PictureExtractor (webapp2.RequestHandler):
    def post (self):
        user_id = self.request.get ('user')
        print 'task queue recevied user id: %s' % user_id

        album_key = self.request.get ('album')
        fb_albums = json.loads (self.request.get ('fb_albums'))
        images = []

        user = User.get_user_by_id (user_id)
        album = ndb.Key (Album, int(album_key), parent=user.key).get ()

        graph = facebook.GraphAPI (user.access_token)

        albums_count = len(fb_albums)

        for fb_album in fb_albums:
            images_list = graph.get_object ("%s/photos" % fb_album["id"])

            if images_list:
                for image in images_list["data"]:
                    imgdata = cStringIO.StringIO(urllib2.urlopen(image["images"][0]["source"]).read ())

                    filename = "/photos/%s_photo" % image["id"]
                    with gcs.open (filename, 'w') as photo:
                        photo.write (imgdata.getvalue ())
                
                    blobkey = blobstore.create_gs_key ("/gs%s" % filename)
                
                    images.append (
                        Photo (
                            id=image["id"],
                            payload = blobstore.BlobKey (blobkey),
                            width=image["images"][0]["width"],
                            height=image["images"][0]["height"]
                        )
                    )

        album.images = images
        album.put ()

    def createCoverImage (self, graph, albumid):
        pictures = graph.get_object ("%s/photos" % albumid, fields="picture",
                limit=4)

        if pictures:
            bg = imaging.new ('RGBA', (200, 200))
            position = (
                (0, 0, 100, 100),
                (0, 100, 100, 200),
                (100, 0, 200, 100),
                (100, 100, 200, 200)
            )

            try:
                index = 0
                for picture in pictures["data"]: 
                    data = cStringIO.StringIO(urllib2.urlopen(picture["picture"]).read ())
                    img = imaging.open (data)
                    
                    ratio = float (max (img.size)) / float (min (img.size))
                    size = int (img.size[0] * ratio), int (img.size[1] * ratio)
                    oldsize = img.size

                    diff = tuple (x - y for x, y in zip (size, oldsize))

                    img = img.resize (size)
                    thumbnail = img.crop ((diff[0] / 2, diff[1] / 2, 100
                        + diff[0] / 2, 100 + diff[1] /2 ))

                    padding = [(100 - thumbnail.size[0]) / 2, (100 -
                        thumbnail.size[1]) / 2]

                    bg.paste (thumbnail, (position[index][0] + padding[0],
                        position[index][1] + padding[1], position[index][2] -
                        padding[0], position[index][3] - padding[1]))
                    index += 1
                    
                    if index > 4:
                        break

                str = StringIO.StringIO ()
                bg.save (str, 'PNG')

                rawdata = str.getvalue ()
                str.close ()

                return rawdata
            except ValueError as e:
                print e
                raise e
        print pictures;
        pass

class PicturesHandler (FacebookHandler):
    def get (self, albumId):
        images = []

        if self.current_user:
            user = User.get_user_by_id (self.current_user["id"])
            if user:

                album = ndb.Key ('Album', long(albumId), parent = user.key)
                print album
                images = album.get ().images

        self.response.out.write (json.dumps (images, cls=JsonAlbumEncode))

class JsonAlbumEncode (json.JSONEncoder):
    def default (self, obj):
        if isinstance (obj, Photo):
            return {
                "id": obj.id,
                "source": "/image/%s" % obj.payload,
                "width": obj.width,
                "height": obj.height
            }
        else:
            return json.JSONEncoder.default (self, obj)

class TokenHandler (FacebookHandler):
    def get (self):
        if 'code' in self.request.GET:
            try:
                token = self.get_token_from_code (self.request.GET['code'], self.request.path_url)
            except urllib2.HTTPError as e:
                err = json.loads (e.read ())
                if err["error"]["code"] == 100:
                    self.redirect (str(self.session["redirect"]["redirect_url"]), abort = True)
                else:
                    raise e

            graph = facebook.GraphAPI (token["access_token"])
            graph.extend_access_token (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET)

            user_info = graph.get_object ("me")
            user_info["updated_time"] = \
            datetime.datetime.strptime (
                user_info["updated_time"][0:-5], 
                "%Y-%m-%dT%H:%M:%S"
            )
            user_info["id"] = int(user_info["id"])
            user = User.get_user_by_id (user_info["id"])

            if not user:
                raise Exception ("Sorry, Something realy went wrong and we can not recover!");

            user.access_token = token["access_token"]
            user.put ()

            self.add_user_to_session (user)
            self.redirect (str(self.session["redirect"]["redirect_url"]))
        else:
            self.session["redirect"] = json.loads (self.request.body) if self.request.body else {"redirect_url": ""}
            print self.session["redirect"]

            script = self.get_renew_url (self.request.path_url);

            self.response.write (script)

    def post (self):
        self.session["redirect"] = json.loads (self.request.body) if self.request.body else {"redirect_url": ""}
        print self.session["redirect"]

        script = self.get_renew_url (self.request.path_url);

        self.response.write (script)

class ImageHandler (blobstore_handlers.BlobstoreDownloadHandler):
    def get (self, resource):
        resource = str(urllib2.unquote(resource))
        self.send_blob(resource)

class LogoutHandler(FacebookHandler):
    def get(self):
        if self.current_user is not None:
            self.session['user'] = None

application = webapp2.WSGIApplication ([
    ('/', MainPage),
    ('/signin', SignInPage),
    ('/albums(/\d+)?', AlbumsHandler),
    ('/signout', LogoutHandler),
    ('/current_user', CurrentUserHandler),
    ('/([^/]+)/pictures', PicturesHandler),
    ('/renew_token', TokenHandler),
    ('/extractor', PictureExtractor),
    ('/create-cover', CreateCover),
    ('/image/([^/]+)', ImageHandler),
], config = CONFIG, debug = True)

