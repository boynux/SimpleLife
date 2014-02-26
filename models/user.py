from google.appengine.ext import ndb
from album import Album

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
    access_token = ndb.StringProperty ()

    @classmethod
    def get_user_by_id (cls, id):
        parent = ndb.Key ('Account', 'Facebook')
        user = cls.query (cls.id == int(id), ancestor = parent).fetch ()

        if len(user):
            return user[0]
        else:
            return None

    def add_album (self, info):
        album = Album (parent = self.key)

        album.name = info["name"]
        album.status = 0
        album.images = []
        album.progress = 0

        album.put ()
        return album

    @property
    def albums (self):
        albums = Album.query (ancestor = self.key).fetch ()

        return albums

