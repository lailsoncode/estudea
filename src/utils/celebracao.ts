import confetti from 'canvas-confetti';

/**
 * Dispara uma animação comemorativa de confetes coloridos na tela.
 * Utiliza a paleta de cores principal e moderna da plataforma Estudea
 * (tons de Roxo, Violeta, Indigo, Azul Claro e o Azul marca).
 */
export const dispararCelebracao = (): void => {
  // Paleta de cores moderna da marca Estudea
  const coresEstudea = [
    '#712ae2', // Roxo (Secondary)
    '#a855f7', // Violeta
    '#4f46e5', // Indigo
    '#38bdf8', // Azul Claro
    '#004ac6', // Azul Estudea (Primary)
  ];

  // 1. Explosão Centralizada Principal
  confetti({
    particleCount: 160,
    spread: 90,
    origin: { x: 0.5, y: 0.6 }, // Centralizado horizontalmente, um pouco abaixo do meio da tela
    colors: coresEstudea,
    scalar: 1.25, // Confetes ligeiramente maiores para melhor visibilidade e impacto 3D
    gravity: 0.85, // Queda um pouco mais lenta e suave
    ticks: 250, // Permite que as partículas continuem na tela por mais tempo
    drift: 0, // Sem vento lateral
  });

  // 2. Micro-explosões laterais coordenadas (efeito de profundidade e "Show")
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.85 }, // Disparo da esquerda inferior
      colors: coresEstudea,
      gravity: 0.9,
    });
  }, 100);

  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.85 }, // Disparo da direita inferior
      colors: coresEstudea,
      gravity: 0.9,
    });
  }, 200);
};
