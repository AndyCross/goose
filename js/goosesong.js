//goosesong allows 
function goosesong() {
	this.trackList = [];
	this.index = -1;

	this.nextSong = function()
	{
		if (this.trackList.length == 0 || this.index >= this.trackList.length)
		{
			return "spotify:track:6JEK0CvvjDjjMUBFoXShNZ";
		}
		else
		{
			this.index++;
			return this.trackList[this.index];
		}
	}

	this.previousSong = function()
	{
		if (this.index > 0)
		{
			this.index--;
			return this.trackList[this.index];
		}
	}

	this.addSong = function(trackUri)
	{
		this.trackList.push(trackUri);
	}

	this.getTracks = function()
	{
		return this.trackList;
	}

	this.getPosition = function()
	{
		return this.index;
	}

	this.currentSong = function() 
	{
		return this.trackList[this.index];
	}

	this.hasMoreSongs = function()
	{
		return this.trackList.length > this.index+1;
	}
}