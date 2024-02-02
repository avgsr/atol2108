var fileNameCSV = "C:\\tmp\\file.csv"; //"./file.csv";
var delim = ";"; //"\t";
var Cashir = "Фкассира И.О.";

var file = FileOpen(fileNameCSV,"r");
if (!file.isValid) { return "Error open file";}
var msg = "";
var recs = file2recs(file); // чеки гр. по нмеру смены
if (msg != "") { return msg;}
for (var i = 0; i < recs.length; i++) {
	res = rec2fptr(recs[i]);
	if (!res) { return msg;}
}
if (FileClose(file) != 0) {
    return "Error close file";
}

function file2recs(file) {
//0 123123;1 573;2 2020-01-30T21:55;3 Приход.;4 35;5 0;6 Товар;7 Наим Товара;8 35.00;9 1
	var col = {"fd":0,"sh":1,"dt":2,"tr":3,"ch":4,"el":5,"p2":6,"nm":7,"pr":8,"qt":9};
	var res = [];
	var oldSh = "";
	var oldFd = "";
	var i = 0;
	var str = FileReadLine(file);
	var arStr = str.split(delim);
	while (str != null) {
		if (oldSh != arStr[col.sh]) {
			var curRec = {}; //новый чек
			curRec.shnm = arStr[col.sh];
			curRec.data = new Date(arStr[col.dt]);
			curRec.cash = 0;
			curRec.elec = 0;
			curRec.coms = [];
			oldSh = arStr[col.sh];
		}
		while (oldSh == arStr[col.sh]) {
			if (oldFd != arStr[col.fd]) {
				var k = (arStr[col.tr] == "Приход.") ? 1 : -1;
				curRec.cash += new Number(arStr[col.ch])*k;
				curRec.elec += new Number(arStr[col.el])*k;
				oldFd = arStr[col.fd];
			}
			while (oldFd == arStr[col.fd]) {
				var newCom = true;
				for (var i = 0; i < curRec.coms.length; i++) {
					if (oldCom == arStr[col.nm]+arStr[col.pr]) { 
						curRec.coms[i].qn += arStr[col.qn]*k;
						newCom = false;
					}
				}
				if (newCom) {
					var com = {};
					com.p2 = (arStr[col.p2] == "Товар") ? 1 : 4;
					com.nm = arStr[col.nm];
					com.pr = new Number(arStr[col.pr]);
					com.qn = new Number(arStr[col.qn])*k;
					curRec.coms.pop(com);
				}
				str = FileReadLine(file);
				if (str != null) {arStr = str.split(delim);}
			}
		}
		res.pop(curRec);
	}
	return res;
}

function rec2fptr(rec) {
	Fptr.setParam(1021, Cashir); //кассир
	Fptr.operatorLogin(); //
	Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_TYPE, Fptr.LIBFPTR_RT_SELL_CORRECTION); //корректируем
	Fptr.setParam(1055, Fptr.LIBFPTR_TT_PATENT); //сно патент
	/* Секция формирования составного тега 1174 (Основание для коррекции) */
	Fptr.setParam(1177, "не был указан тег 2108 по тех. причинам"); /* тег 1177 */
	Fptr.setParam(1178, new Date(rec.data)); /* тег 1178 - "Дата совершения корректируемого расчета"*/
	Fptr.setParam(1179, "0"); //rec.shnm); /* тег 1179 - «Номер документа основания для коррекции»,  */
	Fptr.utilFormTlv(); /* Выполняем метод utilFormTlv() для формирования составного тега 1174 из тегов 1177, 1178, 1179 */
	correctionInfo = Fptr.getParamByteArray(Fptr.LIBFPTR_PARAM_TAG_VALUE); /* забираем результат (массив байтов для тега 1174) в LIBFPTR_PARAM_TAG_VALUE */
	Fptr.setParam(1174, correctionInfo); /* записываем собранный массив байтов в тег 1174 */
	//Fptr.setParam(1192,""); //указав фискальный признак ошибочного чека (по тегу 1192 «дополнительные реквизиты чека»).

	Fptr.openReceipt();
}