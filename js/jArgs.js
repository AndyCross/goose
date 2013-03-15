// Handle URI arguments
/*var sp = getSpotifyApi(1);
var models = sp.require("sp://import/scripts/api/models");
var views = sp.require("sp://import/scripts/api/views");
var ui = sp.require("sp://import/scripts/ui");
var application = models.application;
application.observe(models.EVENT.ARGUMENTSCHANGED, handleArgs);

application.observe(models.EVENT.LINKSCHANGED, handleLinks);
var playerView = new views.Player();

var session = models.session;
session.observe(models.EVENT.STATECHANGED, handleSessionState);

var player = models.player;
player.observe(models.EVENT.CHANGE, handlePlayerChange);

*/

function handleArgs() {
	var state = session.state;
	if (state !== 2) //if not offline
	{
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
	else 
	{
		console.log("skipping tab change due to being offline");
	}
}

function handleLinks() {
	var lastItem = models.application.links[models.application.links.length - 1];
	console.log(lastItem);
	
	$(".section").hide();	// Hide all sections
	$("#leadgoose").show(); //show the lead

	drawPlaylistForUri(lastItem);
}


function handleSessionState() {
	var state = session.state;
	if (state === 2)
	{
		$(".section").hide();//hide all sections
		$("#offline").show();//show the offline view
		console.log("Gone offline")
	}
	else 
	{
		handleStartUp();//ensure our connection is still valid, especially if we have gone offline
		handleArgs();//not gone offline so show the active arg display
	}
}

function handlePlayerChange()
{
	var state = "playing";
	if (!player.playing) state = "paused";

	var positionState = "from beginning";
	if (player.position === null) 
	{
		state = "stopped";
		positionState = "by completing";
	}

	if (player.position > 0)
	{
		positionState = "at custom postion (ms) " + player.position; 
	}

	console.log(state + " " + positionState);
}
