import webapp2
import jinja2
import facebook
import datetime
from google.appengine.ext import ndb
from webapp2_extras import sessions

import json
import os

from config import *
from models.user import User

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
    def get (self):
        albums = []

        if current_user:
            all_albums = self.graph ('me/albums')
            
            if all_albums:
                print albums
                albums = [
                    dict (
                        name = album["name"],
                        icon = self.graph (album["cover_photo"]),
                        dikt = album
                    ) for album in all_albums["data"]
                ]
        else:
            pass

        self.response.out.write (json.dumps (albums))

    def post (self):
        if self.current_user:
            data = json.loads (self.request.body)
            user = User.get_user_by_id (self.current_user['id'])
            user.albums = data["albums"]

            user.put ()

class PicturesHandler (FacebookHandler):
    def get (self):
        info = []
        if self.current_user:
            user = User.get_user_by_id (self.current_user["id"])

            for album in user.albums:
                info.append (self.graph ("%s/photos" % album, fields="picture"))

        self.response.out.write (json.dumps (info))

class TokenHandler (FacebookHandler):
    def get (self):
        if 'code' in self.request.GET:
            token = self.get_token_from_code (self.request.GET['code'], self.request.path_url)

            user = User.get_user_by_id (self.current_user['id'])
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


class LogoutHandler(FacebookHandler):
    def get(self):
        if self.current_user is not None:
            self.session['user'] = None

application = webapp2.WSGIApplication ([
    ('/', MainPage),
    ('/signin', SignInPage),
    ('/albums', AlbumsHandler),
    ('/signout', LogoutHandler),
    ('/current_user', CurrentUserHandler),
    ('/pictures', PicturesHandler),
    ('/renew_token', TokenHandler),
    # ('/([^/]+)/list', AlbumHandler),
    # ('/([^/]+)/upload', AddPhoto)
], config = CONFIG, debug = True)

