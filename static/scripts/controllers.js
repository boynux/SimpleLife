'use strict'

var simpleLifeControllers = angular.module ('simpleLifeControllers', []);

simpleLifeControllers.controller ('IndexCtrl', ['$scope', '$location', '$http',
    function ($scope, $location, $http) {
    }
]);

simpleLifeControllers.controller ('AlbumsCtrl', function ($scope, $http, $location, facebook, facebookService, RenewToken, $sce, Album) {
    Album.query (function (result) {
        $scope.albums = result
    }, function (reason) {
        !!reason && console.log (reason);
        $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
        .success (function (response) {
            console.log (response);
            RenewToken.script = $sce.trustAsHtml (response);
        });

    });

    console.log ($scope.albums);

    $scope.facebook = facebookService;
    $scope.facebook.albumName = '';

    $('#addNewAlbum').on ('shown.bs.modal', function (e) {
        checkFbPermissions ();

        $scope.templateUrl = "partials/albums-list.html";
        console.log ('adding new album');
    });

    var checkFbPermissions = function () {
        facebook.api ('/me/permissions').then (function (response) {
            console.log (response);
            if (angular.isUndefined (response.data[0].user_photos)) {
                $scope.needsPhotoPermission = true;
            } else {
                $scope.needsPhotoPermission = false;
                $scope.message = "permission has been granted!";
            }
        });
    }

    $scope.saveSelectedAlbums = function () {
        var selectedAlbums = [];
        var album = new Album ({
            name: $scope.facebook.albumName || 'default', 
            fb_albums: facebookService.getSelectedAlbums ()
        });

        album.$save ().then (function () {
            $scope.albums = Album.query ();
        });

        $('#addNewAlbum').modal ('hide');
 
/*       
        $http.post ('albums', {"albums": facebookService.getSelectedAlbums ()}).success (
            function (data, status, header, config) {
                console.log ('data has been posted');
            }
        ).error (function (reason) {
            !!reason && console.log (reason);
            $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
            .success (function (response) {
                console.log (response);
                RenewToken.script = $sce.trustAsHtml (response);
            });
        }); 
*/
        // $scope.templateUrl = "partials/confirm.html";
        /*
        $http.post ('albums', {"albums": facebookService.getSelectedAlbums ()}).success (
            function (data, status, header, config) {

                $http.get ('/pictures').success (function (info) {
                    console.log (info);
                    $scope.album_photos = info;
                });
            }
        ).error (function (reason) {
            !!reason && console.log (reason);
            $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
            .success (function (response) {
                console.log (response);
                RenewToken.script = $sce.trustAsHtml (response);
            });
        }); 
        */
    }

    $scope.grantFbPhotoPermission = function () {
        facebook.login ({scope: "user_photos"}).then (function (response) {
            checkFbPermissions ();
        });
    }
});

simpleLifeControllers.controller ('AlbumsListCtrl', ['$scope', '$http', '$location', 'facebookService', 'RenewToken', '$sce', 
    function ($scope, $http, $location, facebookService, RenewToken, $sce) {
       
        facebookService.getAlbums ().then (function (response) {
            console.log ('response: ', response);
            $scope.albumsList = response.data;
        });
                
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
            ).error (function (reason) {
                !!reason && console.log (reason);
                $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
                .success (function (response) {
                    console.log (response);
                    RenewToken.script = $sce.trustAsHtml (response);
                });
            });
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
] ).controller ('ConfirmCtrl', ['$rootScope', '$scope', '$location', '$http', 'RenewToken', '$sce', '$routeParams', 
    function ($rootScope, $scope, $location, $http, RenewToken, $sce, $routeParams) {
        var parameters = {
            speed: 6,
            currentSpeed: 6
        };

        $http.get ('/' + $routeParams.albumId + '/pictures').success (function (info) {
            // console.log (info);
            $scope.album = {
                pictures: info,
            };

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

