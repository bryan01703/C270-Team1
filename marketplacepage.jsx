import React, { useState } from "react";
import ListingForm from "./ListingForm";
import ListingList from "./ListingList";

const MarketplacePage = () => {
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState("");

  // CREATE listing
  const addListing = (listing) => {
    setListings([...listings, { ...listing, id: Date.now() }]);
  };

  // DELETE listing
  const deleteListing = (id) => {
    setListings(listings.filter(item => item.id !== id));
  };

  // FILTER logic
  const filteredListings = filter
    ? listings.filter(item => item.module === filter)
    : listings;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Notes & Tutoring Marketplace</h2>

      <ListingForm onAdd={addListing} />

      <div style={{ marginBottom: "20px" }}>
        <label>Filter by Module: </label>
        <input
          placeholder="e.g. C270"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button onClick={() => setFilter("")}>Clear</button>
      </div>

      <ListingList
        listings={filteredListings}
        onDelete={deleteListing}
      />
    </div>
  );
};

export default MarketplacePage;