var timeout = null;
var stateSending = false;
var stateSinging = false;
var gooseHub = null;
var session = null;
var models = null;
var listView = null;
var player = null;
var imageView = null;
var searcher = null;
var goosesongListing = null;
var tempPlaylistSearch = null;
var loadedList = null;
var tailTrack = null;
var attachedPlayerChangeListener = false;

require([
        '$api/models',
        '$api/location#Location',
        '$api/search#Search',
        '$api/toplists#Toplist',
        '$views/buttons',
        '$views/list#List',
        '$views/image#Image'
        ], function(modelsGlob, Location, Search, Toplist, buttons, List, imageGlob) {

        imageView = imageGlob;

    models = modelsGlob;       
    player = models.player;
    listView = List;
    searcher = Search;
    goosesongListing = new goosesong();

    //command session to load 
    models.session.load('online').done( function() {
        session = models.session;
        session.addEventListener('change:online', handleSessionState);

        // When application has loaded, run pages function
        models.application.load('arguments').done(handleArgs);

        // When arguments change, run pages function
        models.application.addEventListener('arguments', handleArgs);

    });//session.load

    handleStartUp();


});//require

function setLoadedList(playlist)
{
    loadedList = playlist;
}

function search()
{
	$('#prepareToShare').empty();
    $('#playlistDiv').html("<div class='loading'><div class='throbber'><div></div></div></div>")

    var search = searcher.search(document.getElementById('searchTerm').value);    
    search.tracks.snapshot().done(function(searchRes)
        {
            if (tempPlaylistSearch != null)
            {
                tempPlaylistSearch.tracks.clear();
            }


            models.Playlist.createTemporary("searchResults").done(function(playlist)
            {
                tempPlaylistSearch = playlist;
                playlist.load('tracks').done(function(playlistHack){ 
                    searchRes.loadAll('name').each(function(track){
                        playlist.tracks.add(track);
                    });

                    setLoadedList(playlist);
                    var list = getCommonList(playlist);
                    $('#playlistDiv').empty();
                    document.getElementById('playlistDiv').appendChild(list.node);

					window.setTimeout(function() {
						list.init();
					},1000);						
                });
            });
        });
}

function goosifyTable() {
	var headerTable = $('#playlistDiv .sp-list-header-table');
	var playlistTable = $('#playlistDiv .sp-list-table');
    var needToGoosify = playlistTable.find('tr').length > 1 || ( playlistTable.find('tr').length == 1 && playlistTable.find('tr').attrib('height') > 0 );
    if ( needToGoosify ) {
    	var cg = headerTable.find('colgroup');
		if ( cg.children('col').length < 7 ) {
			cg.append('<col style="width: 80px">');
			cg.append('<col style="width: 80px">');		
			headerTable.find('tr .sp-list-header-row').each(function() {
				$(this).append('<td>&nbsp;</td>');
				$(this).append('<td>&nbsp;</td>');
			});
    
			cg = playlistTable.find('colgroup');
			cg.append('<col style="width: 80px">');
			cg.append('<col style="width: 80px">');											
		}
		
    	playlistTable.find('tr').each(function() {			
    		if ( $(this).children('.honk').length === 0 ) {
    			var itemUri = $(this).data('uri');
    			var formattedUri = '"' + itemUri + '"';
    			var honkButton = "<button onclick='stage(" + formattedUri + ");return true;'><span class='goose-dark'></span>honk</button>"						
    			$(this).append('<td class="sp-list-cell honk">' + honkButton + '</td>');
    
    			var honkListButton = "<button onclick='stageMany(" + formattedUri + ");return false;'><span class='goose-blue'></span>+honklist</button>"						
    			$(this).append('<td class="sp-list-cell honk">' + honkListButton + '</td>');
    		}
    	});
    }
}

function buildGoosesongList()
{
    $('#playlistGooseSong').empty();
    var mosaic = "spotify:mosaic";
    models.Playlist.createTemporary("goosesongList").done(function(playlistUnloaded)
    {
        playlistUnloaded.load('tracks').done(function(playlist) {
            $.each(goosesongListing.getTracks(), function(index, item)
            {
                models.fromURI(item).load('name', 'artists', 'album').done(function(track)
                    { 
                        if (index < goosesongListing.getPosition())
                        {
                            track.highlightClass = "played";
                        }
                        else if (index == goosesongListing.getPosition())
                        {
                            track.highlightClass = "playing";
                        }
                        else
                        {
                            track.highlightClass = "pending";
                        }

                        var templated = $('#playlistGooseSongRow_tmpl').jqote(track);
                        $('#playlistGooseSong').append(templated);
                        
                        playlist.tracks.add(track);

                        if (index < 4)
                        {
                            mosaic += track.image.replace("spotify:image", "");
                        }
                    });
            });

            var imageForPlaylist = imageView.fromSource(mosaic, { height: 300, widht: 300 });
            $('#playlistGooseSong').append(imageForPlaylist.node);
        });
        

    });
}

function stageAll()
{

    loadedList.tracks.snapshot().done(function(snapshot)
        {
            for (var i = 0; i < snapshot.length; i++) {
                var item = snapshot.get(i);
                goosesongListing.addSong(item.uri);
              }
        });

    buildGoosesongList();

    showGooselistControls();
}

function stageMany(trackUri)
{
    goosesongListing.addSong(trackUri);

    $("#prepareToShare").hide();

    buildGoosesongList();

    showGooselistControls();    
}

function stage(trackUri)
{
	var t = models.Track.fromURI(trackUri).load('name', 'image', 'artists', 'album').done(function(track) {
                track.album.load('name').done(function(album) {
                
                $("#prepareToShare").html($("#prepareToShare_tmpl").jqote(track));
                showHonkControls();
                });   
			});

    $(".artistLink").attr("href", t.uri);
    showHonkControls();
}

function showGooselistControls()
{
    $("#prepareToShare").hide();
    $("#goosesongControl").show('slow');
}

function showHonkControls()
{
    $("#goosesongControl").hide();
    $("#prepareToShare").show('slow');
}

function federate(trackUri)
{
    setStateSending(true, false);
    gooseHub.server.playTrack(trackUri);

    setCommonPlayTracker();
}

function federateClear()
{
    goosesongListing.clearTracks();
    buildGoosesongList();
}

function federateMany()
{
    if (goosesongListing.hasMoreSongs())
    {
        setStateSending(true, true);
        var firstTrack = goosesongListing.nextSong(); //note: state of playlist here is liable to change

        gooseHub.server.playTrack(firstTrack);

        setCommonPlayTracker();
    }
    else
    {
        $('#goosesongMessage').html("Nice try swan beak, there's no more songs to sing! And no, I won't clear the list for you (yet).");
    }
}

/// Used to do a lightweight federate during a federateMany. Does not need to set up state or tracking in this instance as it 
/// has already been performed
function federateManySingle(trackUri)
{
    gooseHub.server.playTrack(trackUri);
}

function setCommonPlayTracker()
{
    if (timeout !== null)
    {
        clearInterval(timeout);
    }

    timeout = setInterval(function() {
        if (!player.playing) 
        {
            clearInterval(timeout);
        }

        player.load('position').done(function(loadedPlayer){

            var positionReport = player.position;
            if (positionReport == null) {
                console.log("loading");
            }
            else
            {
                //todo: send the track also so that the tailfeece can join mid song
                console.log("sending lead goose position as " + player.position);
                gooseHub.server.syncTrack(player.position);
            }
        });


    }, 5000);
}

function getCommonList(playlist)
{
	var list = listView.forPlaylist(playlist, {fetch:'once'});
	list.addEventListener("first-render", function() {
		goosifyTable() 
	});
    return list;
}

function formatMillisecondsToMinutes(milliseconds)
{
    var seconds = milliseconds/1000;
    var minutes = Math.floor(seconds/60);
    var secondsRemainder = seconds % 60;

    var format = minutes + ":" + zeropad(secondsRemainder, 2);
    return format;
}

function zeropad(number, size) {
  number = number.toString();
  while (number.length < size) number = "0" + number;
  return number;
} 

function setStateSending(sending, singing)
{
    stateSending = sending;
    stateSinging = singing;

    if (sending) {
        $("#sendingInfo").show();

        //when events happen in the player, subscribe and respond to events
        if (!attachedPlayerChangeListener)
        {
            player.addEventListener('change', handlePlayerChange);
            attachedPlayerChangeListener = true;
        }
    }
    else {
        $("#sendingInfo").hide();

        if (attachedPlayerChangeListener)
        {            
            player.removeEventListener('change', handlePlayerChange);
            attachedPlayerChangeListener = false;
        }
    }

}

function showTail(track)
{
    console.log(track);
    tailTrack = track;

    $('#taildetails').empty(); 
    $("#starredness").empty();
            
    //$("#now-playing").empty();
    var cover = $(document.createElement('div')).attr('id', 'player-image');

    try {
        if (tailTrack instanceof models.Track)
        {
            var img = imageView.forTrack(tailTrack, { width: 100, height:100 });

            //var img = new ui.SPImage(track.data.album.cover ? track.data.album.cover : "sp://import/img/placeholders/300-album.png");
            //cover.append($(document.createElement('a')).attr('href', track.data.album.uri));
            cover.append(img.node);
        }
        else
        {
            cover.append($(playerImage.node));
        }

        $("#taildetails").html(cover);
    }
    catch (err) {
        console.log(err);
    }
    
    var song = '<div class="tailtrack"><a href="'+tailTrack.uri+'">'+tailTrack.name+'</a></div>';

    models.fromURI(tailTrack.album.uri).load('name').done(function(albumDetails) 
    {
        var album = '<div class="tailalbum"><a href="'+tailTrack.album.uri+'">'+albumDetails.name+'</a></div>';

        artist = "unknown artist";
        if (tailTrack.artists) {
         artist = "<div class='tailartist'>" + tailTrack.artists[0].name + "</div>";
        }
        /*if (track.album.artist.uri != null)
        {
            artist = '<a href="'+track.album.artist.uri+'">'+track.album.artist.name+'</a>';
        }*/

        var context = player.context, extra ="";
        if(context) { extra = '<a href="'+context+'">here</a>'; } // too lazy to fetch the actual context name
        
        $("#nowPlaying").html("<div>" + artist + song + album + extra + "</div>");


        doTailStar(tailTrack.uri, tailTrack.starred);
    });
}

function handleDragEnter(e) {
    this.style.background = '#999';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';  // See the section on the DataTransfer object.
    return false;
}

function handleDragLeave(e) {
    this.style.background = '#aaa';
}

function handleDrop(e) {
    this.style.background = '#aaa';
    $("#lead-drop-data").empty();
    var uri = e.dataTransfer.getData('Text').toSpotifyURI();

    var linkDrop = new models.fromURI(uri);

    if (linkDrop instanceof models.Playlist || linkDrop instanceof models.Album)
    {
        drawPlaylistForUri(linkDrop.uri);


        var imageForPlaylist = imageView.forPlaylist(linkDrop, { height: 150, widht: 150 });
        $('#lead-drop').html(imageForPlaylist.node);
        $('#lead-drop').append($('#lead-drop-template').jqote(linkDrop));
    }
    else
    {
        $("#lead-drop-data").html("Nice try duck, you can't drop that kind of link here! Try an album or playlist.");
    }

    e.preventDefault();
}

function drawPlaylistForUri(uri)
{
    models.Playlist.fromURI(uri).load('tracks').done(function(playListDrop) {

        setLoadedList(playListDrop);
        var list = getCommonList(playListDrop);

        $('#playlistDiv').empty();
        document.getElementById('playlistDiv').appendChild(list.node);
		
        list.init();        
    });
}

function handleStartUp() {
    $.connection.hub.qs = "group=" + $("#groupIdentifier").val();
    $.connection.hub.url = "http://gooser.azurewebsites.net/gosling";

    gooseHub = $.connection.gooseHub;

    function connectionReady() {
        $("#data").html("Connected to " + $.connection.hub.qs);
    };

    gooseHub.client.playTrack = function(data) {
        console.log(data);
        $("#data").html(data);

        var p = player.playTrack(models.Track.fromURI(data)).done(function ()
            {
                if (stateSinging) {
                    buildGoosesongList();
                }
            });

        $('#taildetails').empty();
        $('#taildetails').html("<div class='loading'><div class='throbber'><div></div></div></div>");

        models.Track.fromURI(data).load('name', 'image', 'artists', 'album').done(function(track) {
                    showTail(track);
                });
    };

    gooseHub.client.syncTrack = function(data) {
        var leaderMS = data * 1;
        var myPositionMS = player.position * 1;

        console.log("This tail goose is " + (leaderMS - myPositionMS) + " behind the lead goose");
    };

    $.connection.hub.start({ jsonp: true })
                    .done(connectionReady)
                    .fail(function(){ $("#data").html("failed to connect"); });

}

function doSetFlock()
{
    $.connection.hub.stop();
    handleStartUp();
}


function addStar(trackUri)
{
    models.library.starredPlaylist.add(trackUri);
    doTailStar(trackUri, true);
}

function removeStar(trackUri)
{
    models.library.starredPlaylist.remove(trackUri);
    doTailStar(trackUri, false);
}

function doTailStar(trackUri, isStarred)
{
    if (isStarred)
    {
        $("#starredness").html("<a href='javascript:removeStar(\"" + trackUri + "\")' class='sp-item sp-track sp-track-availability-0 sp-track-starred'><span class='sp-track-field-star'><span class='sp-icon-star sp-track-starred'></span></span></a>");
    }   
    else
    {
        $("#starredness").html("<a href='javascript:addStar(\"" + trackUri + "\")' class='sp-item sp-track sp-track-availability-0'><span class='sp-track-field-star'><span class='sp-icon-star'></span></span></a>");
    }
}


