const {DataTypes}=require('sequelize'); const db=require('../config/db');
module.exports=db.define('Note',{title:{type:DataTypes.STRING,allowNull:false},description:DataTypes.TEXT,subject:DataTypes.STRING,moduleCode:DataTypes.STRING,fileUrl:DataTypes.STRING,downloads:{type:DataTypes.INTEGER,defaultValue:0}});
