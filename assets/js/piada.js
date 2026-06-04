function piada() {
	const piadas = [
		"Por que os anões não podem morar sozinhos?</br>Eles não são a(u)lto-sufifientes.",
		"Desde 1789 os franceses não investem nem um centavo em geração de energia elétrica, toda a energia deles vem da tomada da bastilha.",
		"Se for sair hoje cuidado para não se machucar com as pancadas de chuva.",
		"Não sei que assunto infinito é esse que os peixes estão sempre debatendo.",
		"Não converso com mulheres que se chamam Agata, acho muito prepotente.",
		"Qual o chá que tomam no Ibama? Viva leão.",
		"Preciso de um amigo chamado Ciente, pra eu andar sempre consciente.",
		"Só não quero que alguma futura namorada termine comigo no banco, porque lá a fila nunca anda.",
		"Os animais seriam tão evoluídos tecnologicamente quanto os humanos se o tubarão-martelo vivesse no mesmo ecossistema do macaco-prego.",
		" - Meu amigo perdeu o curso de relações internacionais dele.</br> - Por que?</br> - Terminou o namoro a distância.",
		"O que um leão usa para arrumar a juba?</br> Uma serpente.",
		"Português de Portugal é bem diferente do Português brasileiro. Por exemplo, em Portugal buceta não é de comer.",
		"Empresa Conhe-Cimentos se torna a número um para fundação de escolas e bibliotecas.",
		"Pegar sauna sempre me traz muita paz e humidade.",
		"Financimento, pra você, que quer financiar até a construção",
		"Não fui aceito numa entrevista de emprego por que não sou articulado o suficiente.</br>Colocar o pé atrás da cabeça foi demais pra mim.",
		"Outro dia minha mãe queria fazer um chá e me pediu pra buscar umas folhas. Ela ficou muito confusa quando eu voltei da papelaria",
	]
	const pPiada = document.getElementById('p-piada');
	if (pPiada) {
		pPiada.innerHTML=piadas[Math.floor((Math.random() * (100))) % (piadas.length)];
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", piada);
} else {
	piada();
}
