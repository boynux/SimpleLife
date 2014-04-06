var module = angular.module ('bnx.module.facebook', [])
.provider ('facebook', function facebookProvider () {
    var initialized = false;

    var defaultParams = { appId: '245215608990152', status: true, cookie: true, xfbml: true };
    var facebookEvents = {
        'auth': ['authResponseChange', 'statusChange', 'login', 'logout']
    };

    var Q = [];

    this.init = function (params) {
        window.fbAsyncInit = function() {
            $.extend (defaultParams, params);
            FB.init(defaultParams);
    
            initialized = true;
            console.log ("Facebook initialization done.");

            processPostInitializeQ ();
        };
    };

    function executeWhenInitialized (callback, self, args) {
        console.log ("adding to Q: ", callback);
        Q.push ([callback, self, args]);
    };


    var processPostInitializeQ = function () {
        console.log ('Processing Q messages.');
        while (item = Q.shift ()) {

            func = item[0];
            self = item[1];
            args = item[2];

            func.apply (self, args);
        }
    };


    this.$get = ["$rootScope", "$q",  function ($rootScope, $q) {
        var Facebook = function () {
            if (!initialized) {
                executeWhenInitialized (Facebook.registerEventHandlers, this, []);
            } else {
                Facebook.registerEventHandlers ();
            }
        }

        Facebook.promise = function (func) {
            var deferred = $q.defer ();

            func (function (response) {
                if (response && response.error) {
                    deferred.reject (response);
                } else {
                    deferred.resolve (response);
                }

                $rootScope.$digest ();
            });

            return deferred.promise;
        };

        Facebook.registerEventHandlers = function () {
            angular.forEach (facebookEvents, function (events, domain) {
                angular.forEach (events, function (_event) {
                    FB.Event.subscribe (domain + '.' + _event, function (response) {
                        $rootScope.$broadcast('fb.' + domain + '.' + _event, response);
                    });
                });
            });
        };
 
        Facebook.prototype = {
            login: function (params) {
                return Facebook.promise (function (callback) {
                    FB.login (function (response) {
                        callback (response);
                    }, params);
                });
            },
       
            api: function (path) {
                return Facebook.promise (function (callback) {
                    FB.api (path, function (response) {
                        callback (response);
                    });
                });
            }
        };
       
        return new Facebook ();
    }];
});

module.directive ('facebookLogin', function () {
    var template = 
        '<div class="fb-login-button" ' +
        'data-max-rows="1" ' + 
        'data-size="{{size||\'medium\'}}" ' +
        'data-show-faces="{{!!showFaces}}" ' +
        'data-auto-logout-link="{{!!autoLogout}}" ' +
        '></div>';

    return {
        restrict: 'E',
        scope: {
            'autoLogout': '@',
            'size': '@',
            'showFaces': '@'
        },
        template: template
    }
});

simpleLifeApp.directive('facebookLike', function ($location) {
    var template = '<div class="fb-like" ' + 
        'data-href="{{href || currentPage}}" ' +
        'data-colorscheme="{{colorScheme || \'light\'}}" ' +
        'data-layout="{{layout || \'standard\'}}" ' +
        'data-action="{{ action || \'like\'}}" ' +
        'data-show-faces="{{!!showFaces}}" ' +
        'data-share="{{!!share}}"' +
        'data-action="{{action || \'like\'}}"' +
        'data-send="false"></div>';

    return {
        restrict:'E',
        scope: {
            'colorScheme': '@',
            'layout':      '@',
            'showFaces':   '@',
            'href':        '@',
            'action':      '@',
            'share':       '@',
        },
        template: template,
        link: function(scope, element, attrs) {
            scope.currentPage = $location.absUrl();
        },
    }
});


module.directive ('facebook', function ($location, facebook) {
    var template = 
        "<div id='fb-root'><script type='text/javascript' async='true' src='" + 
        "//connect.facebook.net/en_US/all.js' id='facebook-jssdk'></script></div>";

    return {
        restrict:'EA',
        template: template,
    }
});

module.factory ('facebookService', function (facebook, $rootScope, $q, $log) {
    var albums = [];
    var selectedAlbums = [];
    var selectedPhotos = [];
    var connected = false;

    var promiseWhenConnectedApi = function (callback) {
        $log.debug ('facebookSevice promise status: ', facebook.connected);
        if (facebook.connected) {
            var promise = callback ();
        } else {
            var defer = $q.defer ();

            $rootScope.$watch (facebook.connected, function (status) {
                $log.debug (status);
                if (status) {
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
            return promiseWhenConnectedApi (function () {
                return facebook.api ('me/albums');
            });
        },
        
        getAlbumPhotos: function (album_id) {
            return promiseWhenConnectedApi (function () {
                return facebook.api ('me/' + album_id + '/photos?fields=picture')
            });
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
        restrict:'EA',
        templateUrl: 'partials/album-select.html',
        link: link
    }
});

