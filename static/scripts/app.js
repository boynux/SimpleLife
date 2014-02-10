'use strict'

var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
    'simpleLifeControllers',
    'facebook'
]);

/*
simpleLifeApp.factory ("fbAuthService", ['$http', '$location', '$rootScope',
    function ($http, $location, $rootScope) {
        var Q = [];

        var initialized = false;
        var connected = false;

        var fb_events = {
            'auth': ['authResponseChange', 'statusChange', 'login', 'logout']
        };

        function addToQ (callback, self, args) {
            console.log ("adding to Q: ", callback);
            Q.push ([callback, self, args]);
        }


        function registerEventHandlers () {
            angular.forEach (fb_events, function (events, domain) {
                angular.forEach (events, function (_event) {
                    FB.Event.subscribe (domain + '.' + _event, function (response) {
                        $rootScope.$broadcast('fb.' + domain + '.' + _event, response);
                    });
                });
            });
        }


        console.log ('queuing up requests ...');
        // addToQ (this.registerLoginEventHandler, this, []);
        addToQ (registerEventHandlers, this, []);
        return {
            init: function (params) { 
                params = params || {
                    appId: '245215608990152',
                    status: true, 
                    cookie: true,
                    xfbml: true
                };
                window.fbAsyncInit = function() {
                    FB.init(params);

                    while (item = Q.shift ()) {
                        console.log (item);

                        func = item[0];
                        self = item[1];
                        args = item[2];

                        func.apply (self, args);
                    }

                    initialized = true;
                    console.log ("Faacebook initialization done.");
                };

                (function() {
                    var e = document.createElement('script');
                    e.type = 'text/javascript';
                    e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
                    e.async = true;
                    document.getElementById('fb-root').appendChild(e);
                }(document));
            },

            isInialized : function () {
                return initialized;
            },

            isConnected: function () {
                return connected;
            },

            registerLoginEventHandler: function () {
                var self = this;
                FB.Event.subscribe ('auth.authResponseChange', 
                    function (response) {
                        console.log (response);
                        if (response.status == 'connected') {
                            self.loginUser ();
                        } else {
                            self.logoutUser ();
                        }
                    });
                },
                
                getAlbumsList: function (callback) {
                    FB.api ('me/albums', function (response) {
                        callback (response);
                    });
                },

                loginUser: function () {
                    FB.api ('/me', function (response) {
                        console.log (response);
                        $rootScope.$apply (function () { $rootScope.user = self.user = response;
                            $http.get ('signin').success (function (response) {
                                console.log (response)
                            }); 
                        });
                    });
                },

                logoutUser: function () {
                    $rootScope.user = false;
                    $http.get ('signout').success (function (response) {
                        console.log (response)
                    });
                }
            }
        }
    ]);
*/
simpleLifeApp.config (['$routeProvider', 'facebookProvider',
    function ($routeProvider, facebookProvider) {
        facebookProvider.init ();
        $routeProvider.
            when ('/', {
                templateUrl: 'partials/index.html',
                controller: 'IndexCtrl'
            }).
            when ('/signin', {
                templateUrl: 'partials/signin.html',
                controller: 'SigninCtrl'
            }).
            when ('/albums', {
                templateUrl: 'partials/albums-list.html',
                controller: 'AlbumsListCtrl'
            }).
            when ('/signout', {
                templateUrl: 'partials/signout.html',
                controller: 'SignOutCtrl'
            }).
            otherwise ({
                redirectTo: '/'
            });
        }
    ]);

simpleLifeApp.directive('fbSignin', function () {
    return {
        restrict:'E',
        template: '<div class="fb-like" data-href="{{page}}" data-colorscheme="light" data-layout="box_count" data-action="like" data-show-faces="true" data-send="false"></div>'
    }
});

simpleLifeApp.directive('fbImage', function (facebook) {
    function link (scope, element, attrs) {
        scope.label = attrs.label;

        facebook.api (attrs.reference).then (function (result) {
            console.log (element);
            scope.info = result;
        });
    }

    return {
        restrict:'E',
        templateUrl: 'partials/album-select.html',
        link: link
    }
});

simpleLifeApp.run (['$rootScope', '$http', 'facebook', 
    function ($rootScope, $http, facebook) {
        $rootScope.user = false;
        $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
            if (response.status == 'connected') {
                facebook.connected = true;

                $http.get ('signin').success (function (response) {
                    console.log (response)
                }); 

                facebook.api ('me').then (function (result) {
                    console.log (result)
                    $rootScope.user = result;
                });
            } else {
                facebook.connected = false;
                $rootScope.user = false;

                $http.get ('signout').success (function (response) {
                    console.log (response)
                }); 
            }
        });
    }
]);
