from google.appengine.ext import ndb
from models.image import Image

class Album (ndb.Model):
    id = ndb.IntegerProperty ()
    name = ndb.StringProperty ()
    type = ndb.StringProperty ()
    count = ndb.IntegerProperty ()
    status = ndb.IntegerProperty ()
    progress = ndb.IntegerProperty ()
    images = ndb.StructuredProperty (Image, repeated = True)
    created_time = ndb.DateTimeProperty (auto_now_add = True)
    updated_time = ndb.DateTimeProperty (auto_now_add = True)


