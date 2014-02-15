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

class FacebookHandler (webapp2.RequestHandler):
    @property
    def current_user (self):
        current_user = None
        cookie = None

        if not self.session.get ("user"):
            cookie = facebook.get_user_from_cookie (
                self.request.cookies, 
                FACEBOOK_APP_ID,
                FACEBOOK_APP_SECRET
            )

            if cookie:
                user = User.get_user_by_id (cookie['uid'])

                if not user:
                    graph = facebook.GraphAPI (cookie["access_token"])

                    user_info = graph.get_object ("me")
                    user_info["updated_time"] = \
                        datetime.datetime.strptime (
                            user_info["updated_time"][0:-5], 
                            "%Y-%m-%dT%H:%M:%S"
                        )
                    user_info["id"] = int(user_info["id"])

                    user = User (parent = ndb.Key ("Account", "Facebook"), **user_info)
                    user.access_token = cookie["access_token"]

                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]
                    
                user.put ()
                    
                self.session["user"] = {
                    "name": user.name,
                    "link": user.link,
                    "id": user.id,
                    "access_token": user.access_token
                }
            else:
                return None

        return self.session.get ("user")

    def get_renew_url (self, redirect_url):
        # redirect to facebook OAuth page to 
        # renew secret_token
        self.session["redirect_url"] = self.request.url
        self.response.out.write ("<script language='javascript'> top.location = \
             'https://www.facebook.com/dialog/oauth?client_id=%s&redirect_uri=%s'</script>" 
             % (FACEBOOK_APP_ID, redirect_url)
        )

    def get_token_from_code (self, code, redirect_url):
        access_token = facebook.get_access_token_from_code (
            code,
            redirect_url,
            # self.request.GET["code"], 
            # self.session.get ("redirect_url"), 
            FACEBOOK_APP_ID, 
            FACEBOOK_APP_SECRET
        )

        return access_token

    def graph (self, api, **args):
        # if "code" in self.request.query:
            
        graph = facebook.GraphAPI (self.current_user["access_token"])
        return graph.get_object (api)

    def dispatch (self):
        self.session_store = sessions.get_store (request = self.request)

        try:
            webapp2.RequestHandler.dispatch (self)
        finally:
            self.session_store.save_sessions (self.response)

    @webapp2.cached_property
    def session (self):
        return self.session_store.get_session ()
 
    def display (self, template = 'index.html', **args):
        template_values = {
            'facebook_app_id': FACEBOOK_APP_ID
            # 'current_user':  self.current_user["id"] if self.current_user else None
        }

        args.update (template_values)

        template = JINJA_ENVIRONMENT.get_template(template)
        self.response.write(template.render(args))

class CurrentUserHandler (FacebookHandler):
    def get (self):
        if self.current_user:
            self.response.out.write (json.dumps ({'uid': self.current_user['id']}))
        else:
            self.abort (401)

class MainPage (FacebookHandler):
    def get (self):
        # if not self.current_user:
        #    self.redirect ("/signin")

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
            albums = json.loads (self.request.body);
            user = User.get_user_by_id (self.current_user['id'])
            user.albums = albums

            user.put ()
class PicturesHandler (FacebookHandler):
    def get (self):
        if self.current_user:
            user = User.get_user_by_id (self.current_user["id"])

            for album in user.albums:
                info = self.graph (album)

                print info

class TokenHandler (FacebookHandler):
    def get (self):
        if 'code' in self.request.GET:
            token = self.get_token_from_code (self.request.GET['code'], self.request.url)

            user = User.get_user_by_id (self.current_user['id'])
            user.access_token = token["access_token"]
            user.put ()

            self.session["user"]["access_token"] = token["access_token"]
            self.redirect ("/#/%s" % self.request.GET['redirect'])
        else:
            redirect_url = self.request.url
            # self.get_renew_url (redirect_url);
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

