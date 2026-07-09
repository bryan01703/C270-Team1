const {DataTypes}=require('sequelize'); const db=require('../config/db');
module.exports=db.define('Review',{rating:DataTypes.INTEGER,comment:DataTypes.TEXT});
