'use strict'

var simpleLifeApp = angular.module ('simpleLifeApp', [
    'ngRoute',
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
                templateUrl: 'partials/albums-list.html',
                controller: 'AlbumsListCtrl'
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
