from google.appengine.ext import ndb

class User (ndb.Model):
    id = ndb.IntegerProperty ()
    name = ndb.StringProperty ()
    first_name = ndb.StringProperty ()
    last_name = ndb.StringProperty ()
    username = ndb.StringProperty ()
    link = ndb.StringProperty ()
    verified = ndb.BooleanProperty ()
    bio = ndb.StringProperty ()
    gender = ndb.StringProperty ()
    locale = ndb.StringProperty ()
    timezone = ndb.IntegerProperty ()
    updated_time = ndb.DateTimeProperty ()
    create_time = ndb.DateTimeProperty (auto_now_add = True)
    last_seen = ndb.DateTimeProperty (auto_now = True)
