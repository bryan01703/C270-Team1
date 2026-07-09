const {DataTypes}=require('sequelize'); const db=require('../config/db');
module.exports=db.define('TutorProfile',{name:DataTypes.STRING,subjects:DataTypes.STRING,hourlyRate:DataTypes.FLOAT,experience:DataTypes.TEXT,bio:DataTypes.TEXT,availability:DataTypes.STRING,contactMethod:DataTypes.STRING});
