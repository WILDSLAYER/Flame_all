// Sonido corto de confirmación generado con Web Audio (sin archivos de audio)

let ctx: AudioContext | null = null;

export function playConfirm(volume = 0.15) {
  try {
    ctx ??= new AudioContext();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    // Dos notas rápidas ascendentes
    [880, 1320].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(now + i * 0.06);
      osc.stop(now + 0.18);
    });
  } catch {
    /* sin audio disponible: se ignora */
  }
}
