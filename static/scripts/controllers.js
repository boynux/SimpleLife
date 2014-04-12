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

        $scope.$on ('bnx.sl.image-manager.default.progress', function (event) {
            $scope.progress = Math.floor ((event.count / event.total) * 100);
        });

        $scope.$on ('bnx.sl.animation.pause', function (event) {
            $scope.pause = true;
        });

        $scope.$on ('bnx.sl.animation.continue', function (event) {
            $scope.pause = false;
        });

        $scope.$on ('bnx.sl.item.default.click', function (ngEvent, event) {
            $log.debug ('click detected!');
            if (!$scope.pause) {
                var parameters = $scope.animation.getParameters ();

                $scope.currentObject = event.displayObject;
                $scope.animation.pause ();

                var imageInfo = $scope.animation.getImage (event.displayObject.get ('name'));
                $scope.activeImage = imageInfo.source;

                var currentPosition = event.displayObject.get ();
                $scope.currentPosition = {
                    x: currentPosition.x,
                    y: currentPosition.y,
                    zIndex: currentPosition.zIndex,
                    width: currentPosition.width,
                    height: currentPosition.height,
                }

                $log.debug ($scope.currentPosition);
                console.debug ('image info:', imageInfo);

                var minWidth = Math.min (imageInfo.width, parameters.clientSize.width);
                var minHeight = Math.min (imageInfo.height, parameters.clientSize.height);

                var ratio = Math.max (imageInfo.width / minWidth, imageInfo.height / minHeight);

                var targetWidth = imageInfo.width / ratio;
                var targetHeight = imageInfo.height / ratio;

                var to = {
                    width: targetWidth,
                    height: targetHeight,
                    x: (parameters.clientSize.width - targetWidth) / 2,
                    y: (parameters.clientSize.height  - targetHeight) / 2,
                    zIndex: 1000
                };

                $scope.animation.transition (event.displayObject, to, collie.Effect.easeOutElastic);
            } else {
                $log.debug ('click, start hiding image ...');
                $scope.animation.transition (
                    $scope.currentObject,
                    $scope.currentPosition, 
                    collie.Effect.easeInQuint
                ).then (function () {
                    $scope.animation.continue ();
                });
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

