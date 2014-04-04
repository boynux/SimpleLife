'use strict'

var simpleLifeControllers = angular.module ('simpleLifeControllers', []);

simpleLifeControllers.controller ('IndexCtrl', ['$scope', '$location', '$http',
    function ($scope, $location, $http) {
    }
]);

simpleLifeControllers.controller ('AlbumsCtrl', function ($scope, $http, $location, facebook, facebookService, RenewToken, $sce, Album) {
    Album.query (function (result) {
        $scope.albums = result
        console.log ($scope.albums);
    }, function (reason) {
        !!reason && console.log (reason);
        $http.post ("/renew_token", {redirect_url: $location.absUrl ()})
        .success (function (response) {
            console.log (response);
            RenewToken.script = $sce.trustAsHtml (response);
        });
    });

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
            name: $scope.facebook.albumName || 'No Name', 
            fb_albums: facebookService.getSelectedAlbums ()
        });

        album.$save ().then (function () {
            $scope.albums = Album.query ();
        });

        $('#addNewAlbum').modal ('hide');
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
] ).controller ('ConfirmCtrl', ['$scope', '$location', '$http', 'RenewToken', '$sce', '$routeParams', '$log', 
    function ($scope, $location, $http, RenewToken, $sce, $routeParams, $log) {
        $scope.pause = false;

        $scope.$on ('bnx.sl.animation.pause', function (event) {
            $scope.pause = true;
        });

        $scope.$on ('bnx.sl.animation.continue', function (event) {
            $scope.pause = false;
        });

        $scope.$on ('bnx.sl.item.click', function (ngEvent, event) {
            var parameters = $scope.animation.getParameters ();

            if (!$scope.pause) {
                $scope.animation.pause ();

                $log.debug ($scope.animation);
                $log.debug (event.displayObject.get ('name'));
                var imageInfo = $scope.animation.getImage (event.displayObject.get ('name'));
                console.debug ('image info:', imageInfo);
                var to = [
                    imageInfo.width,
                    imageInfo.height,
                    (parameters.clientSize.width - imageInfo.width) / 2,
                    (parameters.clientSize.height  - imageInfo.height) / 2,
                    1000
                ];

                var set = ['width', 'height', 'x', 'y', 'zIndex'];
                var effects = [
                    collie.Effect.easeOutSine,
                    collie.Effect.easeOutSine,
                    collie.Effect.easeOutSine,
                    collie.Effect.easeOutSine,
                    collie.Effect.easeOutSine,
                ];

                collie.Timer.transition(event.displayObject, 600, {
                    to:to,
                    set:set,
                    effect: effects
                });

            } else {
                $scope.animation.continue ();
            }
        });

        $scope.$on ('bnx.sl.canvas.move', function (ngEvent, event) {
            var parameters = $scope.animation.getParameters ();

            var offset = $(event.target).offset ();
            var mousePosition = {
                x: event.pageX - offset.left,
                y: event.pageY - offset.top
            };

            parameters.mouseMove = true;

            if (event.type == 'touchmove') {
                mousePosition.x = event.originalEvent.touches[0].pageX - offset.left;
                mousePosition.y = event.originalEvent.touches[0].pageX - offset.top;
            }

            $scope.animation.setAnimationSpeed (
                Math.ceil (
                    parameters.animation.maxSpeed * 
                    (mousePosition.x / parameters.clientSize.width - 0.5)
                )
            );

            event.stopPropagation(); 
            event.preventDefault();
        });

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

