'use strict'

var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
    'ngResource',
    'simpleLifeControllers',
    'bnx.module.facebook',
    'bnx.simple-life.animation'
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

simpleLifeApp.run (['$rootScope', '$http', 'facebookService', '$location',
    function ($rootScope, $http, facebook, $location) {
        $rootScope.$location = $location;
        $rootScope.user = false;
        $rootScope.$on ('fb.auth.authResponseChange', function (event, response) {
            if (response.status == 'connected') {
                $http.get ('signin').success (function (response) {
                    console.log (response)
                    // TODO: Handle sigin response.
                }); 

            } else {
                $http.get ('signout').success (function (response) {
                    console.log (response)
                    //TODO: handle sign out
                }); 
            }
        });
    }
]);

simpleLifeApp.factory ('Album', function ($resource) {
    return $resource ('albums/:id', {albumId: '@id'});
});


