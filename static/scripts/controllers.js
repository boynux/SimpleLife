'use strict'

var simpleLifeControllers = angular.module ('simpleLifeControllers', []);

simpleLifeControllers.controller ('IndexCtrl', ['$scope', '$location', '$http',
    function ($scope, $location, $http) {
    }
]);

simpleLifeControllers.controller ('AlbumsListCtrl', ['$scope', '$http', '$location', 'facebook', 
    function ($scope, $http, $location, $facebook) {
        console.log ($facebook.connected);

        if ($facebook.connected) {
            $facebook.api ('me/albums').then (function (result) {
                console.log (result);
                $scope.albums = result.data;
            });
        } else {
            $scope.$on ('fb.auth.authResponseChange', function (event, response) {
                if (response.status === 'connected') {
                    $facebook.api ('me/albums').then (function (result) {
                        console.log (result);
                        $scope.albums = result.data;
                    });
                }
            });
        }
        
        $scope.submit = function () {
            var albums = [];

            angular.forEach (this.albums, function (album) {
                if (album.selected) {
                    albums.push (album.id);
                }
            });

            $http.post ('albums', {albums: albums}).success (
                function (data, status, header, config) {
                    console.log ('data posted successfully');

                    $location.path ('/confirm');
                }
            );
        }
            
        $scope.wobble = function () {
            console.log (this);
        }
    }
]);

simpleLifeControllers.controller ('SigninCtrl', ['$rootScope', '$location', '$http',
    function ($rootScope, $location, $http) {
        console.log ($rootScope.user);
        if ($rootScope.user) {
            $location.path ('/');
        }
    }
]).controller ('SignOutCtrl', ['$scope', '$location', '$http', 
    function ($scope, $location, $http) {
        $http.get ('signout').success (function () {
            FB.logout (function (response) {
                $location.path ('/');
            });
        });
    }
]).controller ('ConfirmCtrl', ['$rootScope', '$scope', '$location', '$http', 'RenewToken', '$sce', 
    function ($rootScope, $scope, $location, $http, RenewToken, $sce) {
        $http.get ('/pictures').success (function (info) {
            console.log (info);
            $scope.albums = info;
        }).error (function (reason) {
            !!reason && console.log (reason);
            $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
                .success (function (response) {
                    console.log (response);
                    RenewToken.script = $sce.trustAsHtml (response);
                });
        });
    }
]).controller ('RenewTokenCtrl', function ($scope, RenewToken) {
    $scope.renewToken = RenewToken;
});

