import webapp2
import jinja2
import facebook
import datetime
from google.appengine.ext import ndb

import os


from models.user import User

FACEBOOK_APP_ID = '245215608990152'
FACEBOOK_APP_SECRET = 'f75fb1422a1856248cdb1f40069d0e84'

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader("%s/templates/" % os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainPage (webapp2.RequestHandler):
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
            parent = ndb.Key ('Users', 'Facebook')
            user = User.query (User.id == int(current_user["uid"]), ancestor = parent).fetch ()

            graph = facebook.GraphAPI (current_user["access_token"])

            if len(user):
                user = user[0]
            else:
                user_info = graph.get_object ("me")
                print user_info                
                user_info["updated_time"] = datetime.datetime.strptime (user_info["updated_time"][0:-5], "%Y-%m-%dT%H:%M:%S")
                user_info["id"] = int(user_info["id"])

                user = User (**user_info)
                user.put ()
                
            template_values['current_user'] = user.id

            albums = graph.get_object ('me/albums')
            template_values['albums'] = albums

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

application = webapp2.WSGIApplication ([
    ('/', MainPage),
    # ('/([^/]+)/list', AlbumHandler),
    # ('/([^/]+)/upload', AddPhoto)
], debug = True)

