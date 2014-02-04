import webapp2
import jinja2
import facebook
import datetime
from google.appengine.ext import ndb
from webapp2_extras import sessions

import os

from config import *
from models.user import User

class FacebookHandler (webapp2.RequestHandler):
    @property
    def current_user (self):
        current_user = None
        cookie = None

        if not self.session.get ("user") or 'expired' in self.request.query:
            try:
                cookie = facebook.get_user_from_cookie (
                    self.request.cookies, 
                    FACEBOOK_APP_ID,
                    FACEBOOK_APP_SECRET
                )
            except:
                pass

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

                    user = User (**user_info)
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

    def graph (self, api, **args):
        graph = facebook.GraphAPI (self.current_user["access_token"])

        try:
            return graph.get_object (api)
        except facebook.GraphAPIError as error:
            print "ERROR!", error
            self.redirect ('/signin', abort = True)
            self.response.clear ()

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
            'facebook_app_id': FACEBOOK_APP_ID,
            'current_user':  self.current_user["id"] if self.current_user else None
        }

        args.update (template_values)

        template = JINJA_ENVIRONMENT.get_template(template)
        self.response.write(template.render(args))

class MainPage (FacebookHandler):
    def get (self):
        if not self.current_user:
            self.redirect ("/signin")

        self.display ()

class SignInPage (webapp2.RequestHandler):
    def get (self):
        template_values = {
            'facebook_app_id': FACEBOOK_APP_ID,
            'current_user': None,
            'albums': None
        }

        try:
            current_user = facebook.get_user_from_cookie (
                self.request.cookies,
                FACEBOOK_APP_ID,
                FACEBOOK_APP_SECRET
            )
        except:
            current_user = None

        if current_user:
            self.redirect ('/')
               
        template = JINJA_ENVIRONMENT.get_template('signin.html')
        self.response.write(template.render(template_values))
 
class AlbumsHandler (FacebookHandler):
    def get (self):
        albums = []

        if self.current_user:
            albums = self.graph ('me/albums')

            print albums
            albums = [
                dict (
                    name = album["name"],
                    icon = self.graph (album["cover_photo"]),
                    dikt = album
                ) for album in albums["data"]
            ]
        else:
            self.redirect ("/signin")

        self.display ('albums.html', albums = albums)

application = webapp2.WSGIApplication ([
    ('/', MainPage),
    ('/signin', SignInPage),
    ('/albums', AlbumsHandler),
    # ('/([^/]+)/list', AlbumHandler),
    # ('/([^/]+)/upload', AddPhoto)
], config = CONFIG, debug = True)

