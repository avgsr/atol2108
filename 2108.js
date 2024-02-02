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
				var k = (arStr[col.tr] == "Приход.") ? 1 : -1; //приход +, возврат прихода -
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
					com.p2 = (arStr[col.p2] == "Товар") ? 1 : 4; // или услуга
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
	Fptr.setParam(1173, 0); /* тег 1173 - "Тип коррекции", принимает только одно из двух возможных значений:
	"0" - самостоятельная операция,
	"1" - операция по предписанию налогового органа об устранении выявленного нарушения законодательства Российской Федерации о применении ККТ. */
	//Fptr.setParam(1192,""); //указав фискальный признак ошибочного чека (по тегу 1192 «дополнительные реквизиты чека»).
	//Fptr.setParam(Fptr.LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY, true); /* Чтобы чек не печатался (электронный чек), нужно установить параметру LIBFPTR_PARAM_RECEIPT_ELECTRONICALLY значение true. */
	Fptr.openReceipt();
	for (var i = 0; i < rec.coms.length; i++) {
		var com = rec.coms[i];
		Fptr.setParam(Fptr.LIBFPTR_PARAM_COMMODITY_NAME, com.nm); /* LIBFPTR_PARAM_COMMODITY_NAME - название товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PRICE, com.pr); /* LIBFPTR_PARAM_PRICE - цена за единицу */ 
		Fptr.setParam(Fptr.LIBFPTR_PARAM_QUANTITY, com.qn); /* LIBFPTR_PARAM_QUANTITY - количество единиц товара */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_TAX_TYPE, Fptr.LIBFPTR_TAX_NO); /* LIBFPTR_PARAM_TAX_TYPE - номер налоговой ставки, LIBFPTR_TAX_NO - не облагается */
		Fptr.setParam(1212, com.p2); /* тег 1212	Признак предмета расчета*/
		Fptr.setParam(2108, 0); /*2108	Мера количества предмета расчета	int	≥ 1.2*/
		Fptr.registration(); /* выполняем метод registration() для регистрации позиции */
	}
	if (rec.cash != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_CASH); /* LIBFPTR_PARAM_PAYMENT_TYPE - способ расчета, LIBFPTR_PT_CASH - наличными */
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.cash); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	if (rec.elec != 0 ){
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_TYPE, Fptr.LIBFPTR_PT_ELECTRONICALLY); /* LIBFPTR_PT_ELECTRONICALLY - безналичными;*/
		Fptr.setParam(Fptr.LIBFPTR_PARAM_PAYMENT_SUM, rec.elec); /* LIBFPTR_PARAM_PAYMENT_SUM - сумму расчета */
		Fptr.payment(); /* выполняем метод payment() для регистрации оплаты чека */
	}
	//Метод не является обязательным. Если его не использовать, сумма чека будет посчитана автоматически, без округлений копеек.
	//Fptr.receiptTotal(); /* выполняем метод receiptTotal() для регистрации итога чека */
	Fptr.closeReceipt(); /* выполняем метод closeReceipt() для закрытия чека */
	while (Fptr.checkDocumentClosed() < 0) { // Не удалось проверить состояние документа. Вывести пользователю текст ошибки, попросить устранить неполадку и повторить запрос
		msg = Fptr.errorDescription();
		Fptr.logWrite("FiscalPrinter", Fptr.LIBFPTR_LOG_ERROR, msg);
		continue;
	}
	if (!Fptr.getParamBool(Fptr.LIBFPTR_PARAM_DOCUMENT_CLOSED)) // Документ не закрылся. Требуется его отменить (если это чек) и сформировать заново
	{	Fptr.cancelReceipt();
		msg = Fptr.errorDescription();
		return msg;
	}

	if (!Fptr.getParamBool(Fptr.LIBFPTR_PARAM_DOCUMENT_PRINTED)) {// Можно сразу вызвать метод допечатывания документа, он завершится с ошибкой, если это невозможно
		while (Fptr.continuePrint() < 0){// Если не удалось допечатать документ - показать пользователю ошибку и попробовать еще раз.
			msg = Fptr.errorDescription();
			Fptr.logWrite("FiscalPrinter", Fptr.LIBFPTR_LOG_ERROR, "Не удалось напечатать документ (Ошибка \"" + msg+ "\"). Устраните неполадку и повторите.");
			continue;
		}
	}
}
