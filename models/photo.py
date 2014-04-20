from google.appengine.ext import ndb

class Photo (ndb.Model):
    id = ndb.StringProperty ()
    payload = ndb.BlobKeyProperty ()
    height = ndb.IntegerProperty ()
    width = ndb.IntegerProperty ()
