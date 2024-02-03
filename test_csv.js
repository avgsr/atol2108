var fileNameCSV = "C:\\tmp\\file.csv"; //"./file.csv";
var delim = ";"; //"\t";
var Cashir = "Фкассира И.О.";

var file = FileOpen(fileNameCSV,"r");
if (!file.isValid) { return "Error open file";}
var msg = "";
var recs = file2recs(file); // чеки гр. по нмеру смены
if (msg != "") { return msg;}
if (FileClose(file) != 0) {
    return "Error close file";
}

function file2recs(file) {
//0 123123;1 573;2 2020-01-30T21:55;3 Приход.;4 35;5 0;6 Товар;7 Наим Товара;8 35.00;9 1
	var col = {"fd":0,"sh":1,"dt":2,"tr":3,"ch":4,"el":5,"p2":6,"nm":7,"pr":8,"qn":9};
	var res = [];
	var oldSh = "";
	var oldFd = "";
	var j = 0;
	var str = FileReadLine(file);
	var arStr = str.split(delim);
	//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,str);
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
					//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,curRec.coms[i].nm+curRec.coms[i].pr+'\t'+arStr[col.nm]+arStr[col.pr]+'\t'+(curRec.coms[i].nm+curRec.coms[i].pr == arStr[col.nm]+arStr[col.pr]));
					if (curRec.coms[i].nm+curRec.coms[i].pr == arStr[col.nm]+arStr[col.pr]) { 
						curRec.coms[i].qn += arStr[col.qn]*k;
						newCom = false;
					}
				}
				if (newCom) {
					var com = {};
					com.p2 = (arStr[col.p2] == "Товар") ? 1 : 4; // или услуга
					com.nm = arStr[col.nm];
					com.pr = new Number(arStr[col.pr]);
					com.qn = k*new Number(arStr[col.qn]);
					curRec.coms[curRec.coms.length] = com;
				}
				str = FileReadLine(file);
				//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,str);
				if (str != null) {arStr = str.split(delim);}
				if (str == null) break;
			}
			if (str == null) break;
		}
		var summ = 0;
		var tst = '';
		for (var i = 0; i < curRec.coms.length; i++) {
			summ += curRec.coms[i].qn*curRec.coms[i].pr;
			//tst = '\t\t'+curRec.coms[i].nm+'\t'+curRec.coms[i].pr+'\t'+curRec.coms[i].qn+'\t'+curRec.coms[i].qn*curRec.coms[i].pr+'\t'+summ;
			//Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,tst);
		}
		var ok = (summ == curRec.cash+curRec.elec)? 'OK':'--';
		tst = "\t"+ok+'\t'+curRec.shnm+"\t"+curRec.data+"\t"+summ+'\t'+curRec.cash+'\t'+curRec.elec;
		Fptr.logWrite('FiscalPrinter', Fptr.LIBFPTR_LOG_INFO,tst);
		res[j++] = curRec;
	}
	return res;
}
