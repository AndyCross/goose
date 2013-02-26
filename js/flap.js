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

        list.node.classList.add('sp-light');

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
    connection.send(trackUri);
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