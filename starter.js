window.starterSuite=[{name:'S01: обычный запуск, затем остановка',steps:[
{input:{humidity:20,temp:20,rain:false,age:0,tank:50,budget:5,reset:false},expected:{pump:true,vent:false,fault:false,used:2}},
{input:{humidity:50,temp:20,rain:false,age:0,tank:50,budget:5,reset:false},expected:{pump:false,vent:false,fault:false,used:0}}
]}];
