import React from "react";

const ListingList = ({ listings, onDelete }) => {
  return (
    <div>
      {listings.map(item => (
        <div key={item.id} style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px"
        }}>
          <h4>{item.title}</h4>

          <p><b>Module:</b> {item.module}</p>
          <p>{item.description}</p>

          <p>
            <b>Price:</b> {item.price.toLowerCase() === "free"
              ? "Free"
              : `$${item.price}`}
          </p>

          <button onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
};

export default ListingList;