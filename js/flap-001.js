var timeout = null;
var stateSending = false;

function search()
{
	$('#prepareToShare').empty();
    $('#playlistDiv').html("<div class='loading'><div class='throbber'><div></div></div></div>")

    var search = new models.Search(document.getElementById('searchTerm').value);       
    var playlist = new models.Playlist(); 
    search.localResults = models.LOCALSEARCHRESULTS.APPEND;

    search.observe(models.EVENT.CHANGE, function() {

        search.tracks.forEach(function(track) {
            playlist.add(track);
        });

        
		var list = getCommonList(playlist);

        //list.node.classList.add('sp-light');

        $('#playlistDiv').empty();
        document.getElementById('playlistDiv').appendChild(list.node);
    });

    search.appendNext();                
}

function stage(trackUri)
{
	var t = models.Track.fromURI(trackUri, function(track) {
			    $("#prepareToShare").html(tmpl("prepareToShare_tmpl", track));
			});

    var link = new models.Link(trackUri);
    $(".artistLink").attr("href", link.uri);

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
            console.log("sending lead goose position as " + player.position);
            gooseHub.server.syncTrack(player.position);
        }


    }, 5000);
}

function getCommonList(playlist)
{
	return new views.List(playlist, function(track) {
                var trackEx = new views.Track(track,
                                    views.Track.FIELD.NAME |
                                    views.Track.FIELD.STAR |
                                    views.Track.FIELD.ARTIST |
                                    views.Track.FIELD.DURATION);

                $(trackEx.node).append("<span class='sp-right'><button class='add-honk button icon' onclick='stage(\"" + track.uri + "\")'><span class='goose-dark'></span>honk</button></span>");
                return trackEx;
                                            });

}

function handleDataReceived(data)
{
    console.log(data);
    $("#data").html(data);

    var p = player.play(data);

    $('#taildetails').empty();
    $('#taildetails').html("<div class='loading'><div class='throbber'><div></div></div></div>")

    var t1 = models.Track.fromURI(data, function(track) {
                var song = '<a href="'+track.uri+'">'+track.name+'</a>';
                console.log(song);
                var album = '<a href="'+track.album.uri+'">'+track.album.name+'</a>';
                var artist = '<a href="'+track.album.artist.uri+'">'+track.album.artist.name+'</a>';
                var context = player.context, extra ="";
                if(context) { extra = ' from <a href="'+context+'">here</a>'; } // too lazy to fetch the actual context name
                
                $("#nowPlaying").html(song+" by "+artist+" off "+album+extra);
                alert($("nowPlaying").html());

                var templated = tmpl("taildetails_tmpl", track);
                $("#taildetails").html(templated);

            });                         


    var link = new models.Link(trackUri);
    $(".artistLink").attr("href", link.uri);
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
    console.log(track);
    var link = new models.Link(track.uri);

    $('#taildetails').empty();

    if (link.type === models.Link.TYPE.ARTIST)
            playerView.context = models.Artist.fromURI(link.uri);
        else if (link.type === models.Link.TYPE.PLAYLIST)
            playerView.context = models.Playlist.fromURI(link.uri);
        else if (link.type === models.Link.TYPE.INTERNAL) {
            if (tempPlaylist.length > 0)
                playerView.context = tempPlaylist;
        }
            
        //$("#now-playing").empty();
        var cover = $(document.createElement('div')).attr('id', 'player-image');

        if (link.type === models.Link.TYPE.TRACK || link.type === models.Link.TYPE.LOCAL_TRACK ||
            (link.type === models.Link.TYPE.INTERNAL && tempPlaylist.length == 0)) {
            var img = new ui.SPImage(track.data.album.cover ? track.data.album.cover : "sp://import/img/placeholders/300-album.png");
            cover.append($(document.createElement('a')).attr('href', track.data.album.uri));
            cover.children().append(img.node);
        } else {
            cover.append($(playerImage.node));
        }

        console.log(cover);
        $("#taildetails").html(cover);
        
    
    var song = '<a href="'+track.uri+'">'+track.name+'</a>';
    var album = '<a href="'+track.album.uri+'">'+track.album.name+'</a>';
    var artist = '<a href="'+track.album.artist.uri+'">'+track.album.artist.name+'</a>';
    var context = player.context, extra ="";
    if(context) { extra = ' from <a href="'+context+'">here</a>'; } // too lazy to fetch the actual context name
    
    $("#nowPlaying").html(song+" by "+artist+" off "+album+extra);
}