var timeout = null;
var stateSending = false;
var gooseHub = null;
var session = null;
var models = null;
var listView = null;
var player = null;
var imageView = null;
var searcher = null;
var goosesongListing = null;

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

function search()
{
	$('#prepareToShare').empty();
    $('#playlistDiv').html("<div class='loading'><div class='throbber'><div></div></div></div>")

    var search = searcher.search(document.getElementById('searchTerm').value);    
    search.tracks.snapshot().done(function(searchRes)
        {
            models.Playlist.createTemporary("searchResults").done(function(playlist)
            {
                playlist.load('tracks').done(function(playlistHack){ 
                    searchRes.loadAll('name').each(function(track){
                        playlist.tracks.add(track);
                    });

                    var list = getCommonList(playlist);
                    console.log(list);
                    $('#playlistDiv').empty();
                    document.getElementById('playlistDiv').appendChild(list.node);

                    list.init();
                });
            });
        });
}

function buildGoosesongList()
{
    $('#playlistGooseSong').empty();
    $.each(goosesongListing.getTracks(), function(index, item)
        {
            console.log(item);
            models.fromURI(item).load('name', 'artists', 'album').done(function(track)
                { 
                    var templated = $('#playlistGooseSongRow_tmpl').jqote(track);
                    $('#playlistGooseSong').append(templated);
                });
        });
}

function stageMany(trackUri)
{
    goosesongListing.addSong(trackUri);

    $("#prepareToShare").hide();

    buildGoosesongList();

    $("#playlistGooseSong").show('slow');
}

function stage(trackUri)
{
	var t = models.Track.fromURI(trackUri).load('name', 'image', 'artists', 'album').done(function(track) {
                track.album.load('name').done(function(album) {
                
                $("#playlistGooseSong").hide();
                $("#prepareToShare").html($("#prepareToShare_tmpl").jqote(track));
                $("#prepareToShare").show('slow');
                });   
			});

    $(".artistLink").attr("href", t.uri);

}

function federate(trackUri)
{
    setStateSending(true);
    gooseHub.server.playTrack(trackUri);

    if (timeout !== null)
    {
        clearInterval(timeout);
    }

    timeout = setInterval(function() {
        if (!player.playing) 
        {
            clearInterval(timeout);
        }

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


    }, 5000);
}

function getCommonList(playlist)
{
    console.log(playlist);
    var list = listView.forPlaylist(playlist, { header: 'no', getItem : function (item, index) {

                var formattedDuration = formatMillisecondsToMinutes(item.duration);
                item.formattedDuration = formattedDuration;

                var templated = $("#playlistRow_tmpl").jqote({ 'item': item, 'index': index });
                return $(templated)[0];
            }
        }
    );

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

function setStateSending(value)
{
    stateSending = value;

    if (value) {
        $("#sendingInfo").show();
    }
    else {
        $("#sendingInfo").hide();
    }

}

function showTail(track)
{
    $('#taildetails').empty(); 
    $("#starredness").empty();
            
    //$("#now-playing").empty();
    var cover = $(document.createElement('div')).attr('id', 'player-image');

    if (track instanceof models.Track)
    {
        var img = imageView.forTrack(track, { width: 100, height:100 });

        //var img = new ui.SPImage(track.data.album.cover ? track.data.album.cover : "sp://import/img/placeholders/300-album.png");
        //cover.append($(document.createElement('a')).attr('href', track.data.album.uri));
        cover.append(img.node);
    }
    else
    {
        cover.append($(playerImage.node));
    }

    console.log(cover);
    $("#taildetails").html(cover);
    
    var song = '<h2><a href="'+track.uri+'">'+track.name+'</a></h2>';
    var album = '<h2><a href="'+track.album.uri+'">'+track.album.name+'</a></h2>';

    var artist = "<h2>" + track.album.artists[0].name + "</h2>";
    /*if (track.album.artist.uri != null)
    {
        artist = '<a href="'+track.album.artist.uri+'">'+track.album.artist.name+'</a>';
    }*/

    var context = player.context, extra ="";
    if(context) { extra = '<a href="'+context+'">here</a>'; } // too lazy to fetch the actual context name
    
    $("#nowPlaying").html("<div>" + artist + song + album + extra + "</div>");


    doTailStar(track.uri, track.starred);
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
    console.log(uri);

    var linkDrop = new models.fromURI(uri);

    if (linkDrop instanceof models.Playlist || linkDrop instanceof models.Album)
    {
        drawPlaylistForUri(linkDrop.uri);
    }
    else
    {
        console.log(linkDrop);
        $("#lead-drop-data").html("Nice try duck, you can't drop that kind of link here! Try an album or playlist.");
    }

    e.preventDefault();
}

function drawPlaylistForUri(uri)
{
    models.Playlist.fromURI(uri).load('tracks').done(function(playListDrop) {

        var list = getCommonList(playListDrop);

        console.log(list);
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

        var p = player.playTrack(models.Track.fromURI(data));

        $('#taildetails').empty();
        $('#taildetails').html("<div class='loading'><div class='throbber'><div></div></div></div>");

        models.Track.fromURI(data).load('name', 'album', 'artists').done(function(track) {
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


