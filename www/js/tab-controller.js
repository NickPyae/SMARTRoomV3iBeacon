app.controller('TabCtrl',function($scope, $state, AppService){
	$scope.goToNew=function(){
		AppService.newSearch();
		$state.go('tab.search');
	};
	$scope.goToMyReservation=function(){
		$state.go('tab.reservation');
	};
	$scope.goToHome=function(){
		$state.go('tab.home');
	};
	$scope.goToSetting=function(){
		$state.go('tab.setting');
	};
	$scope.goToScan=function(){
		$state.go('tab.scan');
	};
});