from google.appengine.ext import ndb

class Image (ndb.Model):
    source = ndb.StringProperty ()
    height = ndb.IntegerProperty ()
    width = ndb.IntegerProperty ()
