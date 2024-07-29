var fileNameCSV = "C:\\tmp\\file.csv"; //"./file.csv";
var fileNameLog = "C:\\tmp\\log.txt"; 
var delim = ";"; //"\t";

var file = FileOpen(fileNameCSV,"r");
if (!file.isValid) { return "Error open file";}
var flog = FileOpen(fileNameLog,"w"); 
if (!flog.isValid) { return "Error open log";}
var msg = file2recs(file);
if (FileClose(file) != 0) {
    return "Error close file";
}
if (FileClose(flog) != 0) {
    return "Error close log";
}
return msg;

function file2recs(file) {
//платформа тов.позиции
//0РНМ			1Номер ФН		2Адрес расчетов (тег 1009)			
//3ФП		4Ном д	5Тип ФД		6Пр рсч	7Дата/время		8№см	9Наименование		10ПрПрР	11Итого по чеку	12Нал		13Эл	
//1234567890	870	Кассовый чек	Приход	03.06.2024 10:59	91	наименование товара	ТОВАР	61448.87	51448.87	0.00	
//14аванс	15Зачет 16кредитами	17Встречными	18Цена	19Кол	20Номер товара в чеке	21Сумма без НДС по чеку	22Сумма НДС 0% по чеку	23Сумма НДС 10% по чеку	24Сумма НДС 20% по чеку	
//0.00		0.00	10000.00	0.00		600.00	6.00	1			61448.87		0.00			0.00			0.00	
//25НДС10/110%	26НДС18/118%	27НДС20/120%	28Сумма товара	29Пр способа расчета		30Ставка НДС по товару	31Сумма НДС по товару	Признак агента по предмету расчета (тег 1222)	ИНН поставщика	Наименование поставщика (тег 1225)
//0.00		0.00		0.00		3600.00		ЧАСТИЧНЫЙ РАСЧЕТ И КРЕДИТ	-			0.00			
	var col = {"fp":3,"sh":8,"dt":7,"tr":6,"ch":12,"el":13,"kr":16,"it":11,"sr":29,"p2":10,"nm":9,"pr":18,"qn":19,"sm":28};
	var res = "OK";
	var oldSh = ""; //смена
	var curSh = {}; //итоги смена
	curSh.nm = "№";
	curSh.data = "дата";
	curSh.cnt = "чеков";
	curSh.cash = "нал";
	curSh.elec = "безнал";
	curSh.kred = "Кред";
	curSh.sum = "итог";
	var logstr = ""+curSh.nm+"\t"+curSh.data+"\t"+curSh.cnt+"\t"+curSh.sum+"\t"+curSh.cash+"\t"+curSh.elec+"\t"+curSh.kred+"\n";
	FileWrite(flog,logstr);
	var oldFd = ""; //чек
	var j = 0;
	var str = FileReadLine(file);
	var arStr = str.split(delim);
	while (str != null) { //пока не конец файла
		if (oldSh != arStr[col.sh]) {//итоги по сммене для проверки
			logstr = (oldSh=="") ? "" : ""+curSh.nm+"\t"+curSh.data+"\t"+curSh.cnt+"\t"+curSh.sum.toFixed(2)+"\t"+curSh.cash.toFixed(2)+"\t"+curSh.elec.toFixed(2)+"\t"+curSh.kred.toFixed(2)+"\n";
			FileWrite(flog,logstr);
			curSh = {}; //новый смена
			curSh.nm = arStr[col.sh]; //№
			curSh.data = arStr[col.dt]; //дата
			curSh.cnt = 0;             //чеков
			curSh.cash = 0;             //нал
			curSh.elec = 0;             //безнал
			curSh.kred = 0;             //Кредитами
			curSh.sum = 0; //сумма
			oldSh = arStr[col.sh];
		}
		if (oldFd != arStr[col.fp]) { //новый чек
			if (arStr[col.tr] != "Приход") {
				logstr = "ОШИБК "+arStr[col.fp]+" "+arStr[col.tr]+"\n";
				FileWrite(flog,logstr);
				res="ОШИБК";
			}
			curSh.cnt++;
			curSh.cash += Number(arStr[col.ch]);
			curSh.elec += Number(arStr[col.el]);
			curSh.kred += Number(arStr[col.kr]);
			curSh.sum += Number(arStr[col.it]);
			curSh.sum = +curSh.sum.toFixed(2);

			var curRec = {}; //новый чек
			curRec.cash = Number(arStr[col.ch]);
			curRec.elec = Number(arStr[col.el]);
			curRec.kred = Number(arStr[col.kr]);
			curRec.sum = Number(arStr[col.it]); 
			curRec.coms = []; 

			oldFd = arStr[col.fp];
		}
		while (oldFd == arStr[col.fp]) { //по чеку по товарам
			var com = {};
			com.nm = arStr[col.nm];
			logstr = com.nm+"\n";
			//FileWrite(flog,logstr);
			com.p2 = 0;
			if (arStr[col.p2] == "ТОВАР") com.p2 = 1;
			if (arStr[col.p2] == "ПЛАТЕЖ") com.p2 = 10;
			if (com.p2 ==0 ) {
				logstr = "ОШИБК "+arStr[col.fp]+" "+arStr[col.p2]+"\n";
				FileWrite(flog,logstr);
				res="ОШИБК";
			}
			com.sr = 0;
			if (arStr[col.sr] == "ПОЛНЫЙ РАСЧЕТ") com.sr = 4;
			if (arStr[col.sr] == "ЧАСТИЧНЫЙ РАСЧЕТ И КРЕДИТ") com.sr = 5;
			if (arStr[col.sr] == "ОПЛАТА КРЕДИТА") com.sr = 7;
			if (com.sr ==0 ) {
				logstr = "ОШИБК "+arStr[col.fp]+" "+arStr[col.sr]+"\n";
				FileWrite(flog,logstr);
				res="ОШИБК";
			}
			com.pr = Number(arStr[col.pr]);
			com.qn = Number(arStr[col.qn]);
			if ((com.pr ==0 )||(com.qn ==0)) {
				logstr = "ОШИБК "+arStr[col.fp]+" кол или цена 0"+"\n";
				FileWrite(flog,logstr);
				res="ОШИБК";
			}
			curRec.coms[curRec.coms.length] = com;
			str = FileReadLine(file);
			if (str == null) break;
			arStr = str.split(delim);
		}
	}
	return res;
}