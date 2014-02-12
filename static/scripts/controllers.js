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
        
        $scope.submit = function () {
            var albums = [];

            angular.forEach (this.albums, function (album) {
                albums.push (album.id);
            });

            console.log (albums);
            $http.post ('albums', albums).success (
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

