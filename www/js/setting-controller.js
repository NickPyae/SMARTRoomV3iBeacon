app.controller('SettingCtrl',function($scope, $ionicHistory, $state, $stateParams, CredentialService, $ionicPopup, AppService){
	$scope.logOut=function(){
		CredentialService.logout();

		// Clear all navigation stack history
		$ionicHistory.clearHistory();

		AppService.eventSuccess('logout');
	};
})
.controller('SettingAppCtrl',function($rootScope, $scope,AppConfigService, MaskFac, $cordovaNetwork){
	document.addEventListener('deviceready', function () {
		// listen for Online event
		$rootScope.$on('$cordovaNetwork:online', function(event, networkState){
			prepareFilter();
		});

	}, false);

	prepareFilter();

	function prepareFilter() {
		MaskFac.loadingMask(true, 'Loading');
		AppConfigService.prepareFilter().then(function() {
			$scope.landingPageOptions=AppConfigService.landingPageOptions;

			$scope.filterOptions=AppConfigService.filterOptions;

			$scope.userSettings={
				landingPage: AppConfigService.landingPage,
				siteFilter: AppConfigService.filter.site,
				levelFilter: AppConfigService.filter.level
			};
			MaskFac.loadingMask(false);
		}, function(errRes){
			MaskFac.loadingMask(false);
			MaskFac.showMask(MaskFac.error, 'Loading available sites and floors failed');
		});
	};

 	$scope.saveSettings=function(){
    AppConfigService.save($scope.userSettings.landingPage.value,$scope.userSettings.siteFilter.value, $scope.userSettings.levelFilter.value);
    MaskFac.showMask(MaskFac.success, "Settings saved.");
 	};
})
.controller('AppSettingsCtrl', ['$scope', 'CredentialService', 'MaskFac', function ($scope, CredentialService, MaskFac) {

		$scope.validated = null;
		$scope.user = {};

		$scope.user.username = CredentialService.getUid();
		$scope.user.password = CredentialService.getPassword();
		$scope.user.server = CredentialService.getIp();
    $scope.user.checked=CredentialService.isHttpsEnabled();

		$scope.saveSettings = function () {
      if($scope.user.username && $scope.user.password && $scope.user.server) {
        //Lara 10Feb16: authenticate before saving to prevent impersonation
        MaskFac.loadingMask(true, 'Saving settings');
        CredentialService.auth($scope.user.username, $scope.user.password, $scope.user.server, $scope.user.checked)
        .then(function (res) {
          MaskFac.loadingMask(false);
          //Lara 10Feb16: since CredentialService.auth already saves the credentials on success, this extra step of saving is not required.
          MaskFac.showMask(MaskFac.success, "Credentials saved.");
          $scope.validated = true;

        }, function (errRes) {
          MaskFac.loadingMask(false);
          MaskFac.showMask(MaskFac.error, "Invalid credentials/server details, please try again");
        });

			} else {
				$scope.validated = false;
				$scope.errorMsg = 'Please fill in all credentials.'
			}
		}
}]);
