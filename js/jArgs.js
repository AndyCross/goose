// Handle URI arguments
var sp = getSpotifyApi(1);
var models = sp.require("sp://import/scripts/api/models")
var application = models.application;
application.observe(models.EVENT.ARGUMENTSCHANGED, handleArgs);

function handleArgs() {
	var args = models.application.arguments;
	$(".section").hide();	// Hide all sections
	$("#"+args[0]).show();	// Show current section
	console.log(args);

	// If there are multiple arguments, handle them accordingly
	if(args[1]) {		
		switch(args[0]) {
			case "search":
				searchInput(args);
				break;
			case "social":
				socialInput(args[1]);
				break;
		}
	}
}