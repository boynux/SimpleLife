from google.appengine.ext import ndb
from models.image import Image
from models.photo import Photo

class Album (ndb.Model):
    id = ndb.IntegerProperty ()
    name = ndb.StringProperty ()
    type = ndb.StringProperty ()
    count = ndb.IntegerProperty ()
    status = ndb.IntegerProperty ()
    progress = ndb.IntegerProperty ()
    images = ndb.StructuredProperty (Photo, repeated = True)
    cover = ndb.BlobKeyProperty ()
    created_time = ndb.DateTimeProperty (auto_now_add = True)
    updated_time = ndb.DateTimeProperty (auto_now_add = True)


