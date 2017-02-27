app.controller('ScanCtrl',function($scope, $q, $timeout, $state, $ionicPopup, AppService,
								   RoomService , BarcodeScanner, MaskFac){

	$scope.$on('$ionicView.enter',function() {
		scanBarcode();
	});

	$scope.scan = function(){
		scanBarcode();
	};

	function scanBarcode() {
		BarcodeScanner.scan().then(function(res){
			if(res.success) {
				RoomService.decodeQrCode(res.data).then(function(options) {

					angular.forEach(options, function(option) {
						if(angular.lowercase(option.Action) === 'prompt') {
							var alertPopup = $ionicPopup.alert({
								title: 'SMARTRoom',
								template: option.Msg
							});
						}

						if(angular.lowercase(option.Action) === 'redirect') {

							MaskFac.loadingMask(true, 'Loading');

							$timeout(function() {

								MaskFac.loadingMask(false);

								$state.go('tab.home-roomschedule', {param:res.data});
							}, 1000);
						}

						// Action being empty string
						if(!angular.lowercase(option.Action)) {
							var alertPopup = $ionicPopup.alert({
								title: 'SMARTRoom',
								template: 'Room not available.'
							});
						}

            if(angular.lowercase(option.Action) === 'promptstart') {

              MaskFac.loadingMask(true, 'Loading');

              $timeout(function() {

                MaskFac.loadingMask(false);

                $state.go('tab.reservation-detail', {param: [res.data, 'start']});
              }, 1000);
            }

            if(angular.lowercase(option.Action) === 'promptend') {

              MaskFac.loadingMask(true, 'Loading');

              $timeout(function() {

                MaskFac.loadingMask(false);

                $state.go('tab.reservation-detail', {param: [res.data, 'end']});
              }, 1000);
            }
					})
				});
			}
		});
	};
});
