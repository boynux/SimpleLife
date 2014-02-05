var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
    'simpleLifeControllers'
]);

simpleLifeApp.factory ("fbAuthService", ['$http', '$location', '$rootScope',
    function ($http, $location, $rootScope) {
        return {
            registerLoginEventHandler: function () {
                var self = this;

                FB.Event.subscribe ('auth.authResponseChange', 
                    function (response) {
                        if (response.status == 'connected') {
                            self.loginUser ();
                        } else {
                            self.logoutUser ();
                        }
                    });
                },
                
                loginUser: function () {
                    self = this;

                    FB.api ('/me', function (response) {
                        $rootScope.$apply (function () { $rootScope.user = self.user = response });
                        $http.get ('signin').success (function (response) {
                            console.log (response)
                        });
                    });
                },

                logoutUser: function () {
                    $rootScope.$apply (function () { $rootScope.user = false; });
                    $http.get ('signout').success (function (response) {
                        console.log (response)
                    });
                }
            }
        }
    ]);

simpleLifeApp.config (['$routeProvider',
    function ($routeProvider) {
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

simpleLifeApp.run (['$rootScope', '$window', 'fbAuthService', 
    function ($rootScope, $window, fbAuthService) {
        $rootScope.user = false;

        $window.fbAsyncInit = function() {
            FB.init({
                appId: '245215608990152',
                status: true, 
                cookie: true,
                xfbml: true,
            });

            fbAuthService.registerLoginEventHandler ();
        };

        (function() {
            var e = document.createElement('script');
            e.type = 'text/javascript';
            e.src = document.location.protocol + '//connect.facebook.net/en_US/all.js';
            e.async = true;
            document.getElementById('fb-root').appendChild(e);
        }(document));

    }
]);

