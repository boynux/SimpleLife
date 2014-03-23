var module = angular.module ('facebook', [])
.provider ('facebook', function facebookProvider ($injector) {
    var initialized = false;
    var defaultParams = { appId: '245215608990152', status: true, cookie: true, xfbml: true };
    var facebookEvents = {
        'auth': ['authResponseChange', 'statusChange', 'login', 'logout']
    };

    var Q = [];

    this.init = function  (params) {
        window.fbAsyncInit = function() {
            FB.init(params || defaultParams);
    
            initialized = true;
            console.log ("Facebook initialization done.");

            processQ ();
        };

        (function() {
            var e = document.createElement('script');
            e.type = 'text/javascript';
            e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
            e.async = true;
            document.getElementById('fb-root').appendChild(e);
        }(document));

    };

    this.addToQ = function (callback, self, args) {
        console.log ("adding to Q: ", callback);
        Q.push ([callback, self, args]);
    };


    var processQ = function () {
        console.log ('Processing Q messages.');
        while (item = Q.shift ()) {

            func = item[0];
            self = item[1];
            args = item[2];

            func.apply (self, args);
        }
    };

    var defer = function (func, deferred, $scope) {
        func (function (response) {
            if (response && response.error) {
                deferred.reject (response);
            } else {
                deferred.resolve (response);
            }

            $scope.$apply ();
        });
    };

    this.$get = ["$rootScope", "$q",  function ($rootScope, $q) {
        var registerEventHandlers = function () {
            angular.forEach (facebookEvents, function (events, domain) {
                angular.forEach (events, function (_event) {
                    FB.Event.subscribe (domain + '.' + _event, function (response) {
                        $rootScope.$broadcast('fb.' + domain + '.' + _event, response);
                    });
                });
            });
        };
 
        var login = function (params) {
            var deferred = $q.defer ();

            defer (function (callback) {
                FB.login (function (response) {
                    callback (response);
                }, params);
            }, deferred, $rootScope);

            return deferred.promise;
        }
       
        var api = function (path) {
            var deferred = $q.defer ();

            defer (function (callback) {
                FB.api (path, function (response) {
                    callback (response);
                });
            }, deferred, $rootScope);

            return deferred.promise;
        }

        if (!initialized) {
            this.addToQ (registerEventHandlers, this, []);
        } else {
            registerEventHandlers ();
        }

        return  {
            api: api,
            login: login
        }
    }];
});

module.service ('facebookService', function (facebook, $rootScope, $q) {
    var albums = [];
    var selectedAlbums = [];
    var selectedPhotos = [];
    var connected = false;

    var promiseWhenConnectedApi = function (callback) {
        if (facebook.connected) {
            var promise = callback ();
        } else {
            var defer = $q.defer ();

            $rootScope.$watch ('fb.auth.authResponseChange', function (event, response) {
                if (response.status === 'connected') {
                    defer.resolve (callback ());
                }
            });

            var promise = defer.promise;
        }

        return promise;
    }

    $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
        $rootScope.$apply (function () {
            facebook.connected = (response.status == 'connected');

            if (response.status == 'connected') {
                facebook.api ('me').then (function (result) {
                    $rootScope.user = result;
                });
            } else {
                $rootScope.user = null;
            }
        });
    });

    return {
        login: function (params) {
            return facebook.login (params);
        },

        getAlbums: function () {
            var promise =
                promiseWhenConnectedApi (function () {
                    return facebook.api ('me/albums');
                });

            return promise;
        },
        
        getAlbumPhotos: function (album_id) {
            return promiseWhenConnectedApi (function () {
                return facebook.api ('me/' + album_id + '/photos?fields=picture')
            });

            if (facebook.connected) {
                var promise = facebook.api ('me/album_id/photos').then (function (result) {
                });
            } else {
                $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                    if (response.status === 'connected') {
                        var promise = facebook.api ('me/albums').then (function (result) {
                        });
                    }
                });
            }

            return promise;
        },

        selectedAlbum: function (album, selected) {
            if (selected) {
                if (selectedAlbums.indexOf (album) < 0)
                    selectedAlbums.push (album);
            } else {
                var index = selectedAlbums.indexOf (album);

                if (index > -1) {
                    selectedAlbums.splice (index, 1)
                }
            }
        },
        
        getSelectedAlbums: function () {
            return selectedAlbums;
        },

        albums: function () {
            return albums;
        }
    };
});

module.directive('facebookImage', function ($parse, facebook) {
    function link (scope, element, attrs) {
        scope.label = attrs.label;
        scope.model = attrs

        facebook.api (attrs.reference).then (function (result) {
            scope.info = result;
        });
    }

    return {
        transclude: true,
        restrict:'E',
        templateUrl: 'partials/album-select.html',
        link: link
    }
});


