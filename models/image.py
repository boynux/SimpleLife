from google.appengine.ext import ndb

class Image (ndb.Model):
    id = ndb.StringProperty ()
    source = ndb.StringProperty ()
    height = ndb.IntegerProperty ()
    width = ndb.IntegerProperty ()
