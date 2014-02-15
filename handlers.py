import webapp2
import facebook
import datetime
from google.appengine.ext import ndb
from webapp2_extras import sessions

import json
import os

from config import *
from models.user import User

class FBTokenRequired:
    def __init__ (self, redirect_url):
        self._redirect_url = redirect_url

    def __call__ (self, f):
        def decorator (self, *args, **kwargs):
            if 'code' in self.request.GET:
                token = self.get_token_from_code (self.request.GET['code'], self.session.get ('referer'))

            user = User.get_user_by_id (self.current_user['id'])
            user.access_token = token["access_token"]
            user.put ()

            self.add_user_to_session (user);
            self.redirect (self.session.get ('referer'))

        try:
            func (self, *args, **kwargs)
        except facebook.GraphAPIError, e:
            referer = self.request.referer
            self.session["referer"] = referer

            self.response.out.write (json.dumps ({'redirect': True, 'script': self.get_renew_url (referer)}))

        return decorator  

        
def fb_require_token (func):
    def inner (self, *args, **kwargs):
        if 'code' in self.request.GET:
            token = self.get_token_from_code (self.request.GET['code'], self.session.get ('referer'))

            user = User.get_user_by_id (self.current_user['id'])
            user.access_token = token["access_token"]
            user.put ()

            self.add_user_to_session (user);
            self.redirect (self.session.get ('referer'))

        try:
            func (self, *args, **kwargs)
        except facebook.GraphAPIError, e:
            referer = self.request.referer
            self.session["referer"] = referer

            self.response.out.write (json.dumps ({'redirect': True, 'script': self.get_renew_url (referer)}))

    return inner       

class FacebookHandler (webapp2.RequestHandler):
    @property
    def current_user (self):
        current_user = None
        cookie = None

        user = self.get_user_from_session ()
        
        if not user:
            cookie = facebook.get_user_from_cookie (
                self.request.cookies, 
                FACEBOOK_APP_ID,
                FACEBOOK_APP_SECRET
            )

            if cookie:
                user = User.get_user_by_id (cookie['uid'])

                if not user:
                    graph = facebook.GraphAPI (cookie["access_token"])
                    access_token = facebook.extend_access_token (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET)

                    user_info = graph.get_object ("me")
                    user_info["updated_time"] = \
                        datetime.datetime.strptime (
                            user_info["updated_time"][0:-5], 
                            "%Y-%m-%dT%H:%M:%S"
                        )
                    user_info["id"] = int(user_info["id"])

                    user = User (parent = ndb.Key ("Account", "Facebook"), **user_info)
                    user.access_token = result["access_token"]

                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]
                    
                user.put ()
                    
                self.add_user_to_session (user)
            else:
                return None

        return self.get_user_from_session ()

    def add_user_to_session (self, user):
        self.session["user"] = {
            "name": user.name,
            "link": user.link,
            "id": user.id,
            "access_token": user.access_token
        }

    def get_user_from_session (self):
        return self.session.get ("user")

    def get_renew_url (self, redirect_url):
        # redirect to facebook OAuth page to 
        # renew secret_token
        self.session["redirect_url"] = self.request.url
        return "<script language='javascript'> top.location = \
             'https://www.facebook.com/dialog/oauth?client_id=%s&redirect_uri=%s'</script>"  \
             % (FACEBOOK_APP_ID, redirect_url)
        

    def get_token_from_code (self, code, redirect_url):
        access_token = facebook.get_access_token_from_code (
            code,
            redirect_url,
            FACEBOOK_APP_ID, 
            FACEBOOK_APP_SECRET
        )

        return access_token

    def graph (self, api, **args):
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


