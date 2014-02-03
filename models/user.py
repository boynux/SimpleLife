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
    access_token = ndb.StringProperty ()

    @classmethod
    def get_user_by_id (cls, id):
        parent = ndb.Key ('Users', 'Facebook')
        user = cls.query (cls.id == int(id), ancestor = parent).fetch ()

        if len(user):
            return user[0]
        else:
            return None

