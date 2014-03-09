'use strict'

var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
    'ngResource',
    'simpleLifeControllers',
    'facebook'
]).config (['$routeProvider', 'facebookProvider',
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
                templateUrl: 'partials/albums.html',
                controller: 'AlbumsCtrl',
            }).
            when ('/:albumId/pictures', {
                templateUrl: 'partials/confirm.html',
                controller: 'ConfirmCtrl',
            }).
            when ('/signout', {
                templateUrl: 'partials/signout.html',
                controller: 'SignOutCtrl'
            }).
            when ('/confirm', {
                templateUrl: 'partials/confirm.html',
                controller: 'ConfirmCtrl'
            }).
            otherwise ({
                redirectTo: '/'
            });
        }
    ]);

simpleLifeApp.factory ('RenewToken', function () {
    return {script: ''};
});

simpleLifeApp.directive('fbSignin', function () {
    return {
        restrict:'E',
        template: '<div class="fb-like" data-href="{{page}}" data-colorscheme="light" data-layout="box_count" data-action="like" data-show-faces="true" data-send="false"></div>'
    }
});

simpleLifeApp.directive('fbImage', function ($parse, facebook) {
    function link (scope, element, attrs) {
        scope.label = attrs.label;
        scope.model = attrs

        facebook.api (attrs.reference).then (function (result) {
            console.log (element);
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

simpleLifeApp.run (['$rootScope', '$http', 'facebook', '$location',
    function ($rootScope, $http, facebook, $location) {
        $rootScope.$location = $location;
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

simpleLifeApp.service ('facebookService', function (facebook, $rootScope, $q) {
    var albums = [];
    var selectedAlbums = [];
    var selectedPhotos = [];

    var promiseWhenConnectedApi = function (callback) {
        if (facebook.connected) {
            var promise = callback ();
        } else {
            var defer = $q.defer ();

            $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                if (response.status === 'connected') {
                    defer.resolve (callback ());
                }
            });

            var promise = defer.promise;
        }

        return promise;
    }

    return {
        getAlbums: function () {
            var promise =
                promiseWhenConnectedApi (function () {
                    return facebook.api ('me/albums');
                });

            /*
            if (facebook.connected) {
                return facebook.api ('me/albums');
            } else {
                var defer = $q.defer ();

                $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                    if (response.status === 'connected') {
                        defer.resolve (facebook.api ('me/albums'));
                    }
                });

                return defer.promise;
            }
            */
            return promise;
        },
        
        getAlbumPhotos: function (album_id) {
            return promiseWhenConnectedApi (function () {
                return facebook.api ('me/' + album_id + '/photos?fields=picture')
            });

            if (facebook.connected) {
                var promise = facebook.api ('me/album_id/photos').then (function (result) {
                    console.log (result);
                });
            } else {
                $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
                    if (response.status === 'connected') {
                        var promise = facebook.api ('me/albums').then (function (result) {
                            console.log (result);
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

simpleLifeApp.factory ('Album', function ($resource) {
    return $resource ('albums/:id', {albumId: '@id'});
});

