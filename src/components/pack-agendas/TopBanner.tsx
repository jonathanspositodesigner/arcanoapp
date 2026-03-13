const TopBanner = () => {
  return (
    <div
      className="w-full py-3 px-4 text-center"
      style={{
        background: "linear-gradient(90deg, #AC1313 0%, #771A00 100%)",
      }}
    >
      <p
        className="text-sm md:text-[22px] leading-tight"
        style={{ fontFamily: "'Sora', sans-serif", fontWeight: 300 }}
      >
        <span
          className="inline-block mr-2 px-2 py-0.5"
          style={{
            color: "#FF9200",
            borderLeft: "2px solid white",
          }}
        >
          Valor Promocional
        </span>
        <span style={{ color: "#AAAAAA" }}>De R$197,00 por </span>
        <span className="text-white font-bold">12x de R$3,70</span>
      </p>
    </div>
  );
};

export default TopBanner;