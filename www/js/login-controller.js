app.controller('LoginCtrl',function($rootScope, $scope, $state, $timeout, MaskFac,
                                    AppService,  CredentialService, ServerConfig, $ionicModal){
	 $scope.loadLogin=false;
	 $scope.ip="";//help populate last ip
   $scope.otp = "";

   $ionicModal.fromTemplateUrl('templates/modal.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.modal = modal;
    });


   $scope.showVerifyModal = function() {
     $scope.modal.show();
   };

   $scope.generateOTP = function() {
     // Do $http call to generate OTP
     console.log('generate OTP');
   };

   $scope.verify = function(otp) {
     // Do $http call to verify OTP
     console.log(otp);
   };

	 $scope.$on('$ionicView.enter',function(){

    MaskFac.loadingMask(true, 'Initializing');

	 	if(CredentialService.isLoggedIn()){
		 	AppService.goHome();
		 	MaskFac.loadingMask(false);
		 }else{
		 	//get server ip from stored
		 	$scope.ip=CredentialService.getIp();

      if(!$scope.ip) {
          $scope.ip = 'smartroom.mediacorp.com.sg';
      }

		 	$scope.loadLogin=true;
		 	$scope.logginState = false;
		 	MaskFac.loadingMask(false);

	 	}
	 });

  $scope.clearValidation = function() {
      $scope.validation.msg = "";
  }

	$scope.show=false;
	$timeout(function(){
		$scope.show=true;
	},500);

	//check if logged in
	$scope.validation={
		msg:"",
		col:""
	};
	$scope.logginState = false;
	function setValidation(msg, success){
		$scope.validation.msg = msg;
		if(success){
			$scope.validation.col = "balanced";
		}else{
			$scope.validation.col = "assertive";
		}
	}

	function validated(){
		AppService.goHome();
	}

  $scope.enableHTTPS = {
      checked: CredentialService.isHttpsEnabled() // Default https on
  };

	//CredentialService
	$scope.login=function(u,p,i){

		//deal with log in
		if(u=="" || p=="" || i==""){
			setValidation("Empty Field Not Allowed", false);
		}else{
			//clear validations
			setValidation("");
		}

		$scope.logginState = true;

		MaskFac.loadingMask(true, 'Verifying');

		CredentialService.auth(u,p,i, $scope.enableHTTPS.checked)
		.then(function(res){

			AppService.goHome();
			MaskFac.loadingMask(false);
		},function(errRes){
			setValidation("Authorization failed. Please try again.", false);
			$scope.logginState = false;
			MaskFac.loadingMask(false);
		});
	};
})
.controller('VerifyLoginCtrl', function($rootScope, $scope, $state, MaskFac) {

  $scope.goBackToLogin = function() {
    $state.go('login');
  };

});