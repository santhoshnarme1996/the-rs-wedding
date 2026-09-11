import { weddingData } from "./data";

function LiveStream() {
  const { youtubeId, url } = weddingData.liveStream;

  return (
    <main className="live-stream-page">
      <section className="photo-gallery live-stream">
        <div className="live-stream__card">
          <p className="eyebrow">Live Stream</p>
          <h3>Join us for the wedding</h3>
          <p className="photo-gallery__intro">
            Watching from afar? We&apos;re streaming live on Sunday, September 13th
            starting at 7:00 AM IST, covering the ceremonies leading up to the
            Muhurtham. The player below will show the stream once it begins.
          </p>

          <div className="live-stream__frame">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="Santhosh &amp; Rithikha's wedding live stream"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <a className="button" href={url} target="_blank" rel="noreferrer noopener">
            Watch on YouTube
          </a>
        </div>
      </section>
    </main>
  );
}

export default LiveStream;
