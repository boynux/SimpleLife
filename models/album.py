from google.appengine.ext import ndb

class Album (ndb.Model):
    id = ndb.IntegerProperty ()
    name = ndb.StringProperty ()
    type = ndb.StringProperty ()
    count = ndb.IntegerProperty ()
    status = ndb.IntegerProperty ()
    progress = ndb.IntegerProperty ()
    images = ndb.StringProperty (repeated = True)
    created_time = ndb.DateTimeProperty (auto_now_add = True)
    updated_time = ndb.DateTimeProperty (auto_now_add = True)


