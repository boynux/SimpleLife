import webapp2
import jinja2
import facebook
import datetime
from google.appengine.ext import ndb
from webapp2_extras import sessions

import os


from models.user import User

FACEBOOK_APP_ID = '245215608990152'
FACEBOOK_APP_SECRET = 'f75fb1422a1856248cdb1f40069d0e84'

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader("%s/templates/" % os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

CONFIG = {
    'webapp2_extras.sessions': {
        'secret_key': 'my-super-secret-key',
    }
}

class SignInPage (webapp2.RequestHandler):
    def get (self):
        template_values = {
            'facebook_app_id': FACEBOOK_APP_ID,
            'current_user': None,
            'albums': None
        }

        current_user = facebook.get_user_from_cookie (
            self.request.cookies,
            FACEBOOK_APP_ID,
            FACEBOOK_APP_SECRET
        )

        if current_user:
            self.redirect ('/')
               
        template = JINJA_ENVIRONMENT.get_template('signin.html')
        self.response.write(template.render(template_values))
        
class FacebookHandler (webapp2.RequestHandler):
    @property
    def current_user (self):
        current_user = None

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
                    user_info["updated_time"] = datetime.datetime.strptime (user_info["updated_time"][0:-5], "%Y-%m-%dT%H:%M:%S")
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

        return self.session.get ("user")

    def dispatch (self):
        self.session_store = sessions.get_store (request = self.request)

        try:
            webapp2.RequestHandler.dispatch (self)
        finally:
            self.session_store.save_sessions (self.response)

    @webapp2.cached_property
    def session (self):
        return self.session_store.get_session ()
        
class MainPage (FacebookHandler):
    def get (self):
        template_values = {
            'facebook_app_id': FACEBOOK_APP_ID,
            'current_user': None,
            'albums': None
        }

        if self.current_user:
            template_values['current_user'] = self.current_user["id"]

            graph = facebook.GraphAPI (self.current_user["access_token"])
            albums = graph.get_object ('me/albums')
            template_values['albums'] = albums
        else:
            self.redirect ("/signin")

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

application = webapp2.WSGIApplication ([
    ('/', MainPage),
    ('/signin', SignInPage),
    # ('/([^/]+)/list', AlbumHandler),
    # ('/([^/]+)/upload', AddPhoto)
], config = CONFIG, debug = True)

