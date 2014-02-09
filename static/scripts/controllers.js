var simpleLifeControllers = angular.module ('simpleLifeControllers', []);

simpleLifeControllers.controller ('IndexCtrl', ['$scope', '$location', '$http',
    function ($scope, $location, $http) {
    }
]);

simpleLifeControllers.controller ('AlbumsListCtrl', ['$scope', '$http', 'facebook', 
    function ($scope, $http, $facebook) {
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
            /*
        if (typeof FB !== 'undefined') {
            FB.api ('me/albums', function (response) {
                $scope.$apply (function () {
                    $scope.albums = response
                });
            })
        } else {
            $facebook.addToQ (function ($scope) {
                this.getAlbumsList ($scope);
            }, $facebook, [$scope]);
        }
            */
        /*
        $http.get ('albums').success (function (data) {
            $scope.albums = data;
        });

        $scope.orderPrope = 'data';
        */
    }
]);

simpleLifeControllers.controller ('SigninCtrl', ['$rootScope', '$location', '$http',
    function ($rootScope, $location, $http) {
        console.log ($rootScope.user);
        if ($rootScope.user) {
            $location.path ('/');
        }
    }
]);

simpleLifeControllers.controller ('SignOutCtrl', ['$scope', '$location', '$http', 
    function ($scope, $location, $http) {
        $http.get ('signout').success (function () {
            FB.logout (function (response) {
                $location.path ('/');
            });
        });
    }
]);

