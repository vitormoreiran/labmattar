import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { $, $$ } from "./ui/dom.js";

export async function exportProjectVideo({
  state,
  stage,
  stop,
  download,
  slug,
  renderFrame,
  updateTransport,
}) {
  const button = $("#export-mp4"),
    notice = $("#export-notice"),
    progress = $("#export-progress");
  if (typeof VideoEncoder === "undefined") {
    notice.textContent =
      "A exportação MP4 precisa de um navegador com WebCodecs, como uma versão recente do Chrome ou Edge. O roteiro e a imagem podem ser baixados acima.";
    return;
  }
  const resolution = +$("#export-size").value,
    fps = +$("#export-fps").value,
    [a, b] = state.project.aspect.split(":").map(Number);
  let width = resolution,
    height = resolution;
  if (a > b) height = Math.round((resolution * b) / a / 2) * 2;
  else width = Math.round((resolution * a) / b / 2) * 2;
  const totalFrames = Math.ceil(state.compiled.duration * fps);
  if (totalFrames > 10800) {
    notice.textContent =
      "Este roteiro é muito longo para esta exportação. Reduza a duração para até 3 minutos a 60 fps.";
    return;
  }
  const config = {
    codec: "avc1.420033",
    width,
    height,
    bitrate: resolution >= 2160 ? 24000000 : 10000000,
    framerate: fps,
    avc: { format: "avc" },
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) {
    notice.textContent =
      "Esta resolução não é compatível com o codificador deste navegador. Experimente 720 px e 30 fps.";
    return;
  }
  state.exporting = true;
  stop();
  document.body.classList.add("exporting");
  button.disabled = true;
  $$(".modal [data-close]").forEach((x) => (x.disabled = true));
  $("#download-project").disabled = true;
  $("#export-image").disabled = true;
  progress.hidden = false;
  let encoder, muxer, failed;
  try {
    await stage.prepare(state.compiled);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    stage.renderer.setPixelRatio(1);
    stage.setSize(width, height);
    muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: "avc", width, height },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
    encoder = new VideoEncoder({
      output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
      error: (e) => {
        failed = e;
      },
    });
    encoder.configure(config);
    for (let i = 0; i < totalFrames; i++) {
      if (failed) throw failed;
      const time = i === totalFrames - 1 ? state.compiled.duration : i / fps;
      await stage.composite(
        state.compiled,
        time,
        state.project.color,
        state.project.background,
        canvas,
      );
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round((i * 1e6) / fps),
        duration: Math.round(1e6 / fps),
      });
      encoder.encode(frame, { keyFrame: i % Math.max(1, 2 * fps) === 0 });
      frame.close();
      if (encoder.encodeQueueSize > 8) await encoder.flush();
      if (i % 5 === 0) {
        const value = Math.round(((i + 1) / totalFrames) * 100);
        progress.value = value;
        notice.textContent = `Renderizando ${value}% · ${i + 1} de ${totalFrames} quadros`;
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    await encoder.flush();
    if (failed) throw failed;
    muxer.finalize();
    download(new Blob([muxer.target.buffer], { type: "video/mp4" }), slug() + ".mp4", "video/mp4");
    progress.value = 100;
    notice.textContent = "Vídeo concluído. O download foi iniciado.";
  } catch (error) {
    notice.textContent = "A exportação não foi concluída: " + error.message;
  } finally {
    if (encoder && encoder.state !== "closed") encoder.close();
    state.exporting = false;
    document.body.classList.remove("exporting");
    stage.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    stage.resize();
    button.disabled = false;
    $$(".modal [data-close]").forEach((x) => (x.disabled = false));
    $("#download-project").disabled = false;
    $("#export-image").disabled = false;
    renderFrame();
    updateTransport();
  }
}
